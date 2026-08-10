from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import aqi_router, auth_router, user_router, weather_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AQI Predict API",
    description="Backend for the AI Air Quality Prediction Website (Phase 4/7)",
    version="0.1.0",
)

# Allow the Vite dev server (localhost:5173) to call this API directly.
# Tighten allow_origins to your real frontend domain before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(aqi_router.router)
app.include_router(weather_router.router)
app.include_router(user_router.router)


@app.get("/")
def root():
    return {
        "message": "AQI Predict API is running",
        "docs": "/docs",
        "endpoints": [
            "/api/aqi/cities", "/api/aqi/current", "/api/aqi/history",
            "/api/aqi/compare", "/api/aqi/predict",
            "/api/weather/current",
            "/api/auth/register", "/api/auth/login",
            "/api/favorites", "/api/alerts", "/api/alerts/preferences",
        ],
    }
