import pandas as pd
from fastapi import APIRouter, HTTPException

from ..ml.predictor import _get_raw, category_for, latest_reading, predict

router = APIRouter(prefix="/api/aqi", tags=["aqi"])

CITIES = ["Delhi", "Mumbai", "Chennai", "Bengaluru", "Kolkata", "Coimbatore"]


@router.get("/predict")
def predict_aqi(city: str, horizon: int = 24):
    if city not in CITIES:
        raise HTTPException(status_code=404, detail=f"City '{city}' not tracked")
    if horizon not in (1, 24):
        raise HTTPException(status_code=400, detail="horizon must be 1 (next hour) or 24 (next day)")

    result = predict(city, horizon)
    if result is None:
        raise HTTPException(status_code=404, detail="No data available for prediction")
    return result


@router.get("/cities")
def list_cities():
    return {"cities": CITIES}


@router.get("/current")
def current_aqi(city: str):
    if city not in CITIES:
        raise HTTPException(status_code=404, detail=f"City '{city}' not tracked")

    row = latest_reading(city)
    if row is None:
        raise HTTPException(status_code=404, detail="No data available")

    aqi = int(row["AQI"])

    def clean(v):
        return None if pd.isna(v) else float(v)

    return {
        "city": city,
        "pm25": clean(row["PM2.5"]),
        "pm10": clean(row["PM10"]),
        "co": clean(row["CO"]),
        "no2": clean(row["NO2"]),
        "so2": clean(row["SO2"]),
        "o3": clean(row["O3"]),
        "aqi": aqi,
        "category": category_for(aqi),
        "timestamp": row["Date"].isoformat(),
    }


@router.get("/history")
def aqi_history(city: str, hours: int = 168):
    if city not in CITIES:
        raise HTTPException(status_code=404, detail=f"City '{city}' not tracked")

    df = _get_raw()
    g = df[df["City"] == city].sort_values("Date").tail(hours)
    return {
        "city": city,
        "points": [
            {"timestamp": row["Date"].isoformat(), "aqi": int(row["AQI"])}
            for _, row in g.iterrows()
        ],
    }


@router.get("/compare")
def compare_cities(cities: str = "Delhi,Chennai,Bengaluru"):
    names = [c.strip() for c in cities.split(",")]
    results = []
    for name in names:
        if name not in CITIES:
            continue
        row = latest_reading(name)
        if row is not None:
            results.append({"city": name, "aqi": int(row["AQI"]), "category": category_for(int(row["AQI"]))})
    return {"cities": results}
