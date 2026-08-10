import os

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

# CHANGED FOR DEPLOYMENT: CORS origins now come from an environment
# variable (comma-separated), so you can add your real deployed frontend
# URL (e.g. https://aqi-predict.vercel.app) without editing code. Local
# dev origins are always included as a safe fallback.
_extra_origins = os.getenv("FRONTEND_ORIGINS", "")
allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"] + [
    o.strip() for o in _extra_origins.split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # JWT goes in the Authorization header, not cookies — credentials mode isn't needed
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
            "/api/aqi/compare", "/api/aqi/predict", "/api/aqi/map", "/api/aqi/analytics",
            "/api/weather/current",
            "/api/auth/register", "/api/auth/login",
            "/api/favorites", "/api/alerts", "/api/alerts/preferences",
        ],
    }
