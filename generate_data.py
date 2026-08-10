"""
generate_data.py — Synthetic AQI + weather dataset generator.

Produces hourly data for multiple cities over one year, matching the schema
planned in Phase 1 (Date, City, PM2.5, PM10, NO2, SO2, CO, O3, Temperature,
Humidity, WindSpeed, AQI).

This is a stand-in for a real Kaggle/government dataset so the ML pipeline
can be built and tested end-to-end. Swap this for real data by pointing
train_model.py at a CSV with the same column names — no other code changes
needed.

Design choices that make this "realistic enough" to train on meaningfully:
- Each city has a baseline pollution level (Delhi highest, Bengaluru lowest)
- Diurnal pattern: rush-hour peaks (8-10am, 6-9pm), lower overnight
- Seasonal pattern: winter (Nov-Feb) worse due to inversion + stubble burning
  proxy, monsoon (Jun-Sep) better due to rain washing out particulates
- Weather is generated with realistic covariance: higher wind speed and
  rainfall reduce AQI; higher humidity in winter (fog) increases it
- AQI is computed from a weighted pollutant sub-index formula (simplified
  CPCB-style breakpoint approach), not just a random number
"""

import numpy as np
import pandas as pd

np.random.seed(42)

CITIES = {
    "Delhi":      {"base": 180, "amp": 90},
    "Mumbai":     {"base": 110, "amp": 50},
    "Chennai":    {"base": 75,  "amp": 35},
    "Bengaluru":  {"base": 60,  "amp": 25},
    "Kolkata":    {"base": 140, "amp": 60},
    "Coimbatore": {"base": 55,  "amp": 25},
}

START = pd.Timestamp("2025-01-01 00:00")
HOURS = 24 * 365  # one full year, hourly


def seasonal_factor(month):
    # Winter (Nov-Feb): worse. Monsoon (Jun-Sep): better. Shoulder months: mid.
    winter = month in (11, 12, 1, 2)
    monsoon = month in (6, 7, 8, 9)
    if winter:
        return 1.35
    if monsoon:
        return 0.55
    return 1.0


def diurnal_factor(hour):
    # Rush hour bumps at 8-10am and 6-9pm, quiet overnight (2-5am)
    morning = np.exp(-((hour - 9) ** 2) / 8) * 0.35
    evening = np.exp(-((hour - 19) ** 2) / 10) * 0.4
    night_dip = -0.25 if 2 <= hour <= 5 else 0
    return 1.0 + morning + evening + night_dip


def generate_city(city, params, timestamps):
    n = len(timestamps)
    months = timestamps.month
    hours = timestamps.hour

    season = np.array([seasonal_factor(m) for m in months])
    diurnal = np.array([diurnal_factor(h) for h in hours])
    noise = np.random.normal(0, 0.12, n)

    # Weather — correlated with season, drives pollution down when high
    temperature = 24 + 8 * np.sin((months - 4) / 12 * 2 * np.pi) + np.random.normal(0, 2, n)
    humidity = np.clip(55 + 25 * np.array([1 if m in (6,7,8,9) else (0.6 if m in (11,12,1,2) else 0.2) for m in months]) + np.random.normal(0, 8, n), 15, 98)
    wind_speed = np.clip(np.random.gamma(3, 2.2, n), 0.5, 40)
    rainfall = np.where(
        np.isin(months, [6, 7, 8, 9]),
        np.random.exponential(2.5, n) * (np.random.rand(n) < 0.35),
        np.random.exponential(0.3, n) * (np.random.rand(n) < 0.08),
    )
    pressure = 1008 + np.random.normal(0, 4, n)

    wind_effect = 1 - np.clip(wind_speed / 40, 0, 0.5)
    rain_effect = 1 - np.clip(rainfall / 10, 0, 0.4)

    base_pm25 = params["base"] * season * diurnal * wind_effect * rain_effect * (1 + noise)
    pm25 = np.clip(base_pm25 + np.random.normal(0, 5, n), 5, 500)
    pm10 = np.clip(pm25 * np.random.uniform(1.4, 1.8, n), 10, 600)
    no2 = np.clip(pm25 * np.random.uniform(0.25, 0.4, n) + diurnal * 5, 2, 200)
    so2 = np.clip(pm25 * np.random.uniform(0.08, 0.15, n), 1, 80)
    co = np.clip(pm25 * np.random.uniform(0.02, 0.035, n), 0.2, 15)
    o3 = np.clip(40 + 30 * np.sin((hours - 14) / 24 * 2 * np.pi) - pm25 * 0.05 + np.random.normal(0, 8, n), 5, 180)

    aqi = compute_aqi(pm25, pm10, no2, so2, co, o3)

    return pd.DataFrame({
        "Date": timestamps,
        "City": city,
        "PM2.5": pm25.round(1),
        "PM10": pm10.round(1),
        "NO2": no2.round(1),
        "SO2": so2.round(1),
        "CO": co.round(2),
        "O3": o3.round(1),
        "Temperature": temperature.round(1),
        "Humidity": humidity.round(1),
        "WindSpeed": wind_speed.round(1),
        "Rainfall": rainfall.round(2),
        "Pressure": pressure.round(1),
        "AQI": aqi.round(0).astype(int),
    })


def compute_aqi(pm25, pm10, no2, so2, co, o3):
    # Simplified CPCB-style sub-index approach: AQI = max of pollutant sub-indices.
    # Breakpoints approximate India's CPCB PM2.5 scale.
    def sub_index(c, bps):
        idx = np.zeros_like(c)
        for (c_lo, c_hi, i_lo, i_hi) in bps:
            mask = (c >= c_lo) & (c < c_hi)
            idx = np.where(mask, i_lo + (c - c_lo) * (i_hi - i_lo) / (c_hi - c_lo), idx)
        idx = np.where(c >= bps[-1][1], bps[-1][3] + (c - bps[-1][1]), idx)
        return idx

    pm25_bp = [(0,30,0,50),(30,60,50,100),(60,90,100,200),(90,120,200,300),(120,250,300,400),(250,380,400,500)]
    pm10_bp = [(0,50,0,50),(50,100,50,100),(100,250,100,200),(250,350,200,300),(350,430,300,400),(430,600,400,500)]

    i_pm25 = sub_index(pm25, pm25_bp)
    i_pm10 = sub_index(pm10, pm10_bp)
    # NO2/SO2/CO/O3 contribute a smaller, roughly-linear sub-index
    i_no2 = no2 * 1.1
    i_so2 = so2 * 0.9
    i_co = co * 12
    i_o3 = o3 * 1.0

    return np.max(np.vstack([i_pm25, i_pm10, i_no2, i_so2, i_co, i_o3]), axis=0)


def inject_missingness(df, frac=0.02):
    # Real-world datasets have gaps — inject a small % of missing pollutant readings
    cols = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"]
    df = df.copy()
    n = len(df)
    for c in cols:
        idx = np.random.choice(n, size=int(n * frac), replace=False)
        df.loc[idx, c] = np.nan
    return df


if __name__ == "__main__":
    timestamps = pd.date_range(START, periods=HOURS, freq="h")
    frames = [generate_city(city, params, timestamps) for city, params in CITIES.items()]
    df = pd.concat(frames, ignore_index=True)
    df = inject_missingness(df, frac=0.015)
    df = df.sort_values(["City", "Date"]).reset_index(drop=True)

    out_path = "/home/claude/aqi-ml/data/aqi_weather_raw.csv"
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df):,} rows across {len(CITIES)} cities -> {out_path}")
    print(df.head())
    print("\nMissing values per column:")
    print(df.isna().sum())
