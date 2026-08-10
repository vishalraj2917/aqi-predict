"""
train_forecast_model.py — AQI FORECASTING pipeline (Phase 6, corrected).

Why this file exists instead of just train_model.py:
train_model.py predicts AQI from CONCURRENT pollutant readings (PM2.5, PM10
at the same timestamp as the AQI). That's not a forecast — it's nowcasting /
formula inversion, since AQI is derived directly from those same readings.
It scores unrealistically well (R2 ~0.998) and would be useless in
production, because you don't know tomorrow's PM2.5 today.

This file predicts AQI HORIZON hours into the future using only information
available right now: lagged AQI/pollutant history + weather. This is the
honest version of "next hour / next day" prediction described in the
project brief.

Usage:
    python3 train_forecast_model.py --horizon 1    # next hour
    python3 train_forecast_model.py --horizon 24   # next day
"""

import argparse

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor

RAW_PATH = "/home/claude/aqi-ml/data/aqi_weather_raw.csv"
MODEL_DIR = "/home/claude/aqi-ml/models"

LAGS = [1, 3, 6, 12, 24, 48]  # hours back to look
ROLL_WINDOWS = [6, 24]         # rolling mean windows


def load_and_clean(path):
    df = pd.read_csv(path, parse_dates=["Date"])
    pollutant_cols = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"]
    for col in pollutant_cols:
        df[col] = df.groupby("City")[col].transform(lambda s: s.fillna(s.median()))
    for col in pollutant_cols + ["Temperature", "Humidity", "WindSpeed"]:
        lo, hi = df[col].quantile([0.01, 0.99])
        df[col] = df[col].clip(lo, hi)
    if "Rainfall" not in df.columns:
        df["Rainfall"] = 0.0
    if "Pressure" not in df.columns:
        df["Pressure"] = 1010.0
    return df.sort_values(["City", "Date"]).reset_index(drop=True)


def build_features(df, horizon):
    """
    Build a forecasting frame: for each row, features are lagged
    AQI/pollutant/weather values (things knowable at prediction time),
    and the target is AQI `horizon` hours later.

    Note: current-timestamp weather is treated as a forecasted input
    (in production this would come from a weather API's forecast, not
    an observation) — that's standard practice for this kind of model
    and is called out in the README.
    """
    df = df.copy()
    frames = []

    for city, g in df.groupby("City"):
        g = g.sort_values("Date").reset_index(drop=True)

        feat = pd.DataFrame({"Date": g["Date"], "City": city})

        # AQI right now is legitimately known at prediction time (it's what
        # we're forecasting FROM) — this is the true basis for a persistence
        # baseline, not an hour-old reading.
        feat["AQI_now"] = g["AQI"]

        for lag in LAGS:
            feat[f"AQI_lag{lag}"] = g["AQI"].shift(lag)
            feat[f"PM25_lag{lag}"] = g["PM2.5"].shift(lag)

        for w in ROLL_WINDOWS:
            feat[f"AQI_roll{w}"] = g["AQI"].shift(1).rolling(w).mean()

        # Weather at prediction time (forecasted, not historical)
        feat["Temperature"] = g["Temperature"]
        feat["Humidity"] = g["Humidity"]
        feat["WindSpeed"] = g["WindSpeed"]
        feat["Rainfall"] = g["Rainfall"]
        feat["Pressure"] = g["Pressure"]

        feat["hour"] = g["Date"].dt.hour
        feat["month"] = g["Date"].dt.month
        feat["day_of_week"] = g["Date"].dt.dayofweek
        feat["is_weekend"] = (feat["day_of_week"] >= 5).astype(int)
        feat["season_winter"] = feat["month"].isin([11, 12, 1, 2]).astype(int)
        feat["season_monsoon"] = feat["month"].isin([6, 7, 8, 9]).astype(int)

        # Target: AQI `horizon` hours ahead of the CURRENT row
        feat["target_AQI"] = g["AQI"].shift(-horizon)

        frames.append(feat)

    out = pd.concat(frames, ignore_index=True)
    out = out.dropna().reset_index(drop=True)
    return out


def time_split(df, test_frac=0.15):
    train_idx, test_idx = [], []
    for city, g in df.groupby("City"):
        n = len(g)
        cut = int(n * (1 - test_frac))
        train_idx += list(g.index[:cut])
        test_idx += list(g.index[cut:])
    return df.loc[train_idx], df.loc[test_idx]


def evaluate(model, X_test, y_test, name):
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    print(f"[{name}]  MAE {mae:.2f}  RMSE {rmse:.2f}  R2 {r2:.4f}")
    return {"name": name, "model": model, "mae": mae, "rmse": rmse, "r2": r2}


def main(horizon):
    print(f"=== Training forecast model: horizon = {horizon}h ===\n")
    df = load_and_clean(RAW_PATH)
    feat_df = build_features(df, horizon)

    encoder = LabelEncoder()
    feat_df["city_encoded"] = encoder.fit_transform(feat_df["City"])

    feature_cols = [c for c in feat_df.columns if c not in ("Date", "City", "target_AQI")]
    train_df, test_df = time_split(feat_df)

    X_train, y_train = train_df[feature_cols], train_df["target_AQI"]
    X_test, y_test = test_df[feature_cols], test_df["target_AQI"]
    print(f"Train: {len(X_train):,} | Test: {len(X_test):,}\n")

    # Naive baseline: "AQI in `horizon` hours = AQI right now"
    baseline_pred = test_df["AQI_now"]
    baseline_mae = mean_absolute_error(y_test, baseline_pred)
    print(f"Naive baseline (persistence) MAE: {baseline_mae:.2f}\n")

    results = []
    rf = RandomForestRegressor(n_estimators=250, max_depth=12, min_samples_leaf=4, n_jobs=-1, random_state=42)
    rf.fit(X_train, y_train)
    results.append(evaluate(rf, X_test, y_test, "Random Forest"))

    xgb = XGBRegressor(n_estimators=400, max_depth=5, learning_rate=0.04, subsample=0.85, colsample_bytree=0.85, random_state=42, n_jobs=-1)
    xgb.fit(X_train, y_train)
    results.append(evaluate(xgb, X_test, y_test, "XGBoost"))

    best = min(results, key=lambda r: r["rmse"])
    improvement = baseline_mae - best["mae"]
    print(f"\nBest: {best['name']}  (beats naive baseline by {improvement:.2f} MAE, {100*improvement/baseline_mae:.1f}% improvement)")

    importances = pd.Series(best["model"].feature_importances_, index=feature_cols).sort_values(ascending=False)
    print("\nTop 8 features:")
    print(importances.head(8).to_string())

    suffix = f"h{horizon}"
    joblib.dump(best["model"], f"{MODEL_DIR}/aqi_forecast_{suffix}.pkl")
    joblib.dump(encoder, f"{MODEL_DIR}/city_encoder_{suffix}.pkl")
    joblib.dump(feature_cols, f"{MODEL_DIR}/feature_columns_{suffix}.pkl")
    print(f"\nSaved -> {MODEL_DIR}/aqi_forecast_{suffix}.pkl")

    return best


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--horizon", type=int, default=24, help="Hours ahead to forecast (1 = next hour, 24 = next day)")
    args = parser.parse_args()
    main(args.horizon)
