from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# --- Auth ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# --- AQI / Weather ---
class AQIReadingOut(BaseModel):
    city: str
    pm25: float
    pm10: float
    co: float
    no2: float
    so2: float
    o3: float
    aqi: int
    category: str
    timestamp: datetime


class WeatherOut(BaseModel):
    city: str
    temperature: float
    humidity: float
    wind_speed: float
    rainfall: float
    pressure: float
    timestamp: datetime


class PredictionOut(BaseModel):
    city: str
    horizon_hours: int
    predicted_aqi: int
    category: str
    confidence: float
    predicted_for: datetime


# --- Favorites / Alerts ---
class FavoriteCreate(BaseModel):
    city: str


class AlertPrefCreate(BaseModel):
    city: str
    threshold_aqi: int
    email_enabled: bool = True


class AlertOut(BaseModel):
    id: int
    title: str
    message: Optional[str] = None
    severity: str
    date: datetime

    class Config:
        from_attributes = True
