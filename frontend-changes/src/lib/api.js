// api.js — thin wrapper around fetch() for the FastAPI backend.
//
// CHANGED FOR DEPLOYMENT: the backend URL is no longer hardcoded to
// localhost. It reads from the VITE_API_URL environment variable (set in
// .env for local dev, and in your hosting provider's dashboard — e.g.
// Vercel's Environment Variables settings — for production), falling back
// to localhost so local development still works with zero setup.

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("aqi_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("aqi_token", token);
  else localStorage.removeItem("aqi_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* no JSON body */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- AQI ---
export const getCities = () => request("/api/aqi/cities");
export const getCurrentAQI = (city) => request(`/api/aqi/current?city=${encodeURIComponent(city)}`);
export const getHistory = (city, hours = 168) =>
  request(`/api/aqi/history?city=${encodeURIComponent(city)}&hours=${hours}`);
export const compareCities = (cities) =>
  request(`/api/aqi/compare?cities=${encodeURIComponent(cities.join(","))}`);
export const predictAQI = (city, horizon) =>
  request(`/api/aqi/predict?city=${encodeURIComponent(city)}&horizon=${horizon}`);
export const getMapData = () => request("/api/aqi/map");
export const getAnalytics = (city) => request(`/api/aqi/analytics?city=${encodeURIComponent(city)}`);

// --- Weather ---
export const getCurrentWeather = (city) => request(`/api/weather/current?city=${encodeURIComponent(city)}`);

// --- Auth ---
export const register = (name, email, password) =>
  request("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
export const login = (email, password) =>
  request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

// --- Favorites ---
export const getFavorites = () => request("/api/favorites");
export const addFavorite = (city) => request("/api/favorites", { method: "POST", body: JSON.stringify({ city }) });
export const removeFavorite = (city) => request(`/api/favorites/${encodeURIComponent(city)}`, { method: "DELETE" });

// --- Alerts ---
export const getAlerts = () => request("/api/alerts");
export const setAlertPreference = (city, threshold_aqi, email_enabled) =>
  request("/api/alerts/preferences", {
    method: "POST",
    body: JSON.stringify({ city, threshold_aqi, email_enabled }),
  });
