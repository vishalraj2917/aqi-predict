"""
ml/predictor.py — loads the trained forecast models once at startup and
serves predictions. This is predict.py from Phase 6, adapted to run inside
the API process instead of as a standalone script.
"""

import os
from pathlib import Path

import joblib
import pandas as pd

ML_DIR = Path(__file__).parent
RAW_PATH = ML_DIR / "aqi_weather_raw.csv"

LAGS = [1, 3, 6, 12, 24, 48]
ROLL_WINDOWS = [6, 24]

_cache = {}


def _load(horizon: int):
    if horizon in _cache:
        return _cache[horizon]
    suffix = f"h{horizon}"
    model = joblib.load(ML_DIR / f"aqi_forecast_{suffix}.pkl")
    encoder = joblib.load(ML_DIR / f"city_encoder_{suffix}.pkl")
    feature_cols = joblib.load(ML_DIR / f"feature_columns_{suffix}.pkl")
    _cache[horizon] = (model, encoder, feature_cols)
    return _cache[horizon]


def category_for(aqi: int) -> str:
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


_raw_df = None


def _get_raw():
    global _raw_df
    if _raw_df is None:
        df = pd.read_csv(RAW_PATH, parse_dates=["Date"])
        pollutant_cols = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"]
        for col in pollutant_cols:
            df[col] = df.groupby("City")[col].transform(lambda s: s.fillna(s.median()))
        _raw_df = df
    return _raw_df


def latest_reading(city: str):
    """Most recent AQI + pollutant + weather reading for a city."""
    df = _get_raw()
    g = df[df["City"] == city].sort_values("Date")
    if g.empty:
        return None
    return g.iloc[-1]


def predict(city: str, horizon: int):
    if horizon not in (1, 24):
        raise ValueError("horizon must be 1 or 24")

    model, encoder, feature_cols = _load(horizon)
    df = _get_raw()
    g = df[df["City"] == city].sort_values("Date").reset_index(drop=True)
    if g.empty:
        return None

    latest = g.iloc[-49:].reset_index(drop=True)
    row = {"AQI_now": latest["AQI"].iloc[-1]}
    for lag in LAGS:
        row[f"AQI_lag{lag}"] = latest["AQI"].iloc[-1 - lag] if len(latest) > lag else latest["AQI"].iloc[0]
        row[f"PM25_lag{lag}"] = latest["PM2.5"].iloc[-1 - lag] if len(latest) > lag else latest["PM2.5"].iloc[0]
    for w in ROLL_WINDOWS:
        row[f"AQI_roll{w}"] = latest["AQI"].iloc[-w:].mean()

    last_row = latest.iloc[-1]
    predicted_for = last_row["Date"] + pd.Timedelta(hours=horizon)
    row["Temperature"] = last_row["Temperature"]
    row["Humidity"] = last_row["Humidity"]
    row["WindSpeed"] = last_row["WindSpeed"]
    row["Rainfall"] = last_row["Rainfall"]
    row["Pressure"] = last_row["Pressure"]
    row["hour"] = predicted_for.hour
    row["month"] = predicted_for.month
    row["day_of_week"] = predicted_for.dayofweek
    row["is_weekend"] = int(predicted_for.dayofweek >= 5)
    row["season_winter"] = int(predicted_for.month in (11, 12, 1, 2))
    row["season_monsoon"] = int(predicted_for.month in (6, 7, 8, 9))
    row["city_encoded"] = encoder.transform([city])[0]

    X = pd.DataFrame([row])[feature_cols]
    pred = max(0, round(float(model.predict(X)[0])))

    return {
        "city": city,
        "horizon_hours": horizon,
        "predicted_aqi": pred,
        "category": category_for(pred),
        "confidence": 0.86 if horizon == 1 else 0.83,  # from validation R2, see Phase 6 README
        "predicted_for": predicted_for.to_pydatetime(),
    }
