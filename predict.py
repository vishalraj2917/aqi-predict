"""
predict.py — demonstrates how the FastAPI backend (Phase 4/7) will call
the trained forecast models.

Usage:
    python3 predict.py --city Chennai --horizon 24
"""

import argparse

import joblib
import pandas as pd

MODEL_DIR = "/home/claude/aqi-ml/models"
RAW_PATH = "/home/claude/aqi-ml/data/aqi_weather_raw.csv"


def load_artifacts(horizon):
    suffix = f"h{horizon}"
    model = joblib.load(f"{MODEL_DIR}/aqi_forecast_{suffix}.pkl")
    encoder = joblib.load(f"{MODEL_DIR}/city_encoder_{suffix}.pkl")
    feature_cols = joblib.load(f"{MODEL_DIR}/feature_columns_{suffix}.pkl")
    return model, encoder, feature_cols


def category_for(aqi):
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


def build_live_features(city, horizon, encoder, feature_cols):
    """
    In production this would pull the last 48h of readings for `city` from
    the database (populated by a scheduled ingestion job) plus the latest
    weather forecast from the Weather API, and assemble the same feature
    vector used at training time. Here we simulate that by reading the most
    recent rows from the synthetic dataset.
    """
    df = pd.read_csv(RAW_PATH, parse_dates=["Date"])
    g = df[df["City"] == city].sort_values("Date").reset_index(drop=True)
    latest = g.iloc[-49:].reset_index(drop=True)  # last 48h + current

    LAGS = [1, 3, 6, 12, 24, 48]
    ROLL_WINDOWS = [6, 24]
    row = {}
    row["AQI_now"] = latest["AQI"].iloc[-1]
    for lag in LAGS:
        row[f"AQI_lag{lag}"] = latest["AQI"].iloc[-1 - lag] if len(latest) > lag else latest["AQI"].iloc[0]
        row[f"PM25_lag{lag}"] = latest["PM2.5"].iloc[-1 - lag] if len(latest) > lag else latest["PM2.5"].iloc[0]
    for w in ROLL_WINDOWS:
        row[f"AQI_roll{w}"] = latest["AQI"].iloc[-w:].mean()

    last_row = latest.iloc[-1]
    now = last_row["Date"] + pd.Timedelta(hours=horizon)
    row["Temperature"] = last_row["Temperature"]
    row["Humidity"] = last_row["Humidity"]
    row["WindSpeed"] = last_row["WindSpeed"]
    row["Rainfall"] = last_row["Rainfall"]
    row["Pressure"] = last_row["Pressure"]
    row["hour"] = now.hour
    row["month"] = now.month
    row["day_of_week"] = now.dayofweek
    row["is_weekend"] = int(now.dayofweek >= 5)
    row["season_winter"] = int(now.month in (11, 12, 1, 2))
    row["season_monsoon"] = int(now.month in (6, 7, 8, 9))
    row["city_encoded"] = encoder.transform([city])[0]

    return pd.DataFrame([row])[feature_cols], last_row["Date"]


def predict(city, horizon):
    model, encoder, feature_cols = load_artifacts(horizon)
    X, as_of = build_live_features(city, horizon, encoder, feature_cols)
    pred = float(model.predict(X)[0])
    pred = max(0, round(pred))

    return {
        "city": city,
        "as_of": str(as_of),
        "horizon_hours": horizon,
        "predicted_aqi": pred,
        "category": category_for(pred),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--city", default="Chennai")
    parser.add_argument("--horizon", type=int, default=24, choices=[1, 24])
    args = parser.parse_args()

    result = predict(args.city, args.horizon)
    print(result)
