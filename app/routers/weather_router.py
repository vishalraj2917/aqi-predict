from fastapi import APIRouter, HTTPException

from ..ml.predictor import latest_reading

router = APIRouter(prefix="/api/weather", tags=["weather"])

CITIES = ["Delhi", "Mumbai", "Chennai", "Bengaluru", "Kolkata", "Coimbatore"]


@router.get("/current")
def current_weather(city: str):
    if city not in CITIES:
        raise HTTPException(status_code=404, detail=f"City '{city}' not tracked")

    row = latest_reading(city)
    if row is None:
        raise HTTPException(status_code=404, detail="No data available")

    return {
        "city": city,
        "temperature": row["Temperature"],
        "humidity": row["Humidity"],
        "wind_speed": row["WindSpeed"],
        "rainfall": row["Rainfall"],
        "pressure": row["Pressure"],
        "timestamp": row["Date"].isoformat(),
    }
