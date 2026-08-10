"""
train_model.py — AQI prediction training pipeline (Phase 6).

Steps: load -> clean -> feature engineer -> train (RF, XGBoost) -> evaluate
-> save best model.

To use a REAL dataset instead of the synthetic one: replace RAW_PATH below
with your CSV's path. Required columns: Date, City, PM2.5, PM10, NO2, SO2,
CO, O3, Temperature, Humidity, WindSpeed, AQI (Rainfall/Pressure optional —
pipeline handles their absence).
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor

RAW_PATH = "/home/claude/aqi-ml/data/aqi_weather_raw.csv"
MODEL_OUT = "/home/claude/aqi-ml/models/aqi_model.pkl"
ENCODER_OUT = "/home/claude/aqi-ml/models/city_encoder.pkl"
FEATURE_LIST_OUT = "/home/claude/aqi-ml/models/feature_columns.pkl"

FEATURE_COLS = [
    "PM2.5", "PM10", "NO2", "SO2", "CO", "O3",
    "Temperature", "Humidity", "WindSpeed",
    "Rainfall", "Pressure",
    "hour", "month", "day_of_week", "is_weekend",
    "season_winter", "season_monsoon", "season_summer",
    "city_encoded",
]
TARGET_COL = "AQI"


def load_data(path):
    df = pd.read_csv(path, parse_dates=["Date"])
    print(f"Loaded {len(df):,} rows, {df['City'].nunique()} cities")
    return df


def clean_data(df):
    df = df.copy()
    pollutant_cols = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"]

    # Missing values: fill by per-city median (keeps city-level baseline intact)
    for col in pollutant_cols:
        if df[col].isna().any():
            df[col] = df.groupby("City")[col].transform(lambda s: s.fillna(s.median()))

    # Outlier clipping: clip to 1st/99th percentile per pollutant to guard against
    # sensor spikes without deleting rows
    for col in pollutant_cols + ["Temperature", "Humidity", "WindSpeed"]:
        lo, hi = df[col].quantile([0.01, 0.99])
        df[col] = df[col].clip(lo, hi)

    if "Rainfall" not in df.columns:
        df["Rainfall"] = 0.0
    if "Pressure" not in df.columns:
        df["Pressure"] = 1010.0

    df = df.dropna(subset=[TARGET_COL])
    print(f"After cleaning: {len(df):,} rows")
    return df


def engineer_features(df, encoder=None, fit_encoder=True):
    df = df.copy()
    df["hour"] = df["Date"].dt.hour
    df["month"] = df["Date"].dt.month
    df["day_of_week"] = df["Date"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["season_winter"] = df["month"].isin([11, 12, 1, 2]).astype(int)
    df["season_monsoon"] = df["month"].isin([6, 7, 8, 9]).astype(int)
    df["season_summer"] = df["month"].isin([3, 4, 5]).astype(int)

    if encoder is None:
        encoder = LabelEncoder()
    if fit_encoder:
        df["city_encoded"] = encoder.fit_transform(df["City"])
    else:
        df["city_encoded"] = encoder.transform(df["City"])

    return df, encoder


def evaluate(model, X_test, y_test, name):
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    print(f"\n[{name}]")
    print(f"  MAE  : {mae:.2f}")
    print(f"  RMSE : {rmse:.2f}")
    print(f"  R2   : {r2:.4f}")
    return {"name": name, "model": model, "mae": mae, "rmse": rmse, "r2": r2}


def main():
    df = load_data(RAW_PATH)
    df = clean_data(df)
    df, city_encoder = engineer_features(df, fit_encoder=True)

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    # Time-aware split: last 15% of each city's timeline held out, rather than
    # a random shuffle, since a random split would leak adjacent hours (which
    # are highly correlated) into both train and test.
    df_sorted = df.sort_values(["City", "Date"])
    test_frac = 0.15
    train_idx, test_idx = [], []
    for city, group in df_sorted.groupby("City"):
        n = len(group)
        cut = int(n * (1 - test_frac))
        train_idx += list(group.index[:cut])
        test_idx += list(group.index[cut:])

    X_train, X_test = X.loc[train_idx], X.loc[test_idx]
    y_train, y_test = y.loc[train_idx], y.loc[test_idx]
    print(f"\nTrain: {len(X_train):,} rows | Test: {len(X_test):,} rows (time-based split, last 15% per city)")

    # Baseline: naive "predict current AQI persists" — establishes the bar
    # a real model needs to beat
    naive_pred = df_sorted.loc[test_idx].groupby("City")["AQI"].shift(1).bfill()
    baseline_mae = mean_absolute_error(y_test, naive_pred.loc[test_idx])
    print(f"Naive baseline (persistence) MAE: {baseline_mae:.2f}\n")

    results = []

    rf = RandomForestRegressor(
        n_estimators=200, max_depth=14, min_samples_leaf=3,
        n_jobs=-1, random_state=42,
    )
    rf.fit(X_train, y_train)
    results.append(evaluate(rf, X_test, y_test, "Random Forest"))

    xgb = XGBRegressor(
        n_estimators=400, max_depth=6, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85,
        random_state=42, n_jobs=-1,
    )
    xgb.fit(X_train, y_train)
    results.append(evaluate(xgb, X_test, y_test, "XGBoost"))

    best = min(results, key=lambda r: r["rmse"])
    print(f"\nBest model: {best['name']} (RMSE {best['rmse']:.2f}, {baseline_mae - best['mae']:.2f} MAE better than naive baseline)")

    # Feature importance for the winning model
    importances = pd.Series(best["model"].feature_importances_, index=FEATURE_COLS).sort_values(ascending=False)
    print("\nTop 8 features:")
    print(importances.head(8).to_string())

    joblib.dump(best["model"], MODEL_OUT)
    joblib.dump(city_encoder, ENCODER_OUT)
    joblib.dump(FEATURE_COLS, FEATURE_LIST_OUT)
    print(f"\nSaved model -> {MODEL_OUT}")
    print(f"Saved city encoder -> {ENCODER_OUT}")


if __name__ == "__main__":
    main()
