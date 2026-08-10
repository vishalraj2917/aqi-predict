import { useEffect, useState } from "react";
import { categoryFor, adviceFor } from "../lib/aqi";
import { getCurrentAQI, getCurrentWeather, getHistory, compareCities, predictAQI, getFavorites } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const DEFAULT_FAVORITES = ["Chennai", "Coimbatore"];
const COMPARE_CITIES = ["Delhi", "Chennai", "Bengaluru"];

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState(DEFAULT_FAVORITES);
  const [active, setActive] = useState(0);
  const [current, setCurrent] = useState(null);
  const [weather, setWeather] = useState(null);
  const [history, setHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [compare, setCompare] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const city = favorites[active];

  // Load the user's real favorite list if logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    getFavorites()
      .then((res) => { if (res.favorites?.length) setFavorites(res.favorites); })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [cur, w, hist, fc, cmp] = await Promise.all([
          getCurrentAQI(city),
          getCurrentWeather(city),
          getHistory(city, 24 * 7),
          predictAQI(city, 24),
          compareCities(COMPARE_CITIES),
        ]);
        if (cancelled) return;
        setCurrent(cur);
        setWeather(w);
        setHistory(hist.points);
        setForecast(fc);
        setCompare(cmp.cities);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [city]);

  if (error) {
    return (
      <main style={{ maxWidth: 700, margin: "60px auto", padding: "0 40px" }}>
        <div style={{ background: "#f3dcd8", color: "var(--danger)", padding: 20, borderRadius: 6, fontSize: 13 }}>
          Couldn't reach the backend ({error}). Make sure it's running at http://127.0.0.1:8000 — see aqi-backend/README.md.
        </div>
      </main>
    );
  }

  const cat = current ? categoryFor(current.aqi) : null;
  const maxAqi = history.length ? Math.max(...history.map((p) => p.aqi)) : 1;
  const minAqi = history.length ? Math.min(...history.map((p) => p.aqi)) : 0;
  const chartPoints = history.filter((_, i) => i % Math.ceil(history.length / 8 || 1) === 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", maxWidth: 1300, margin: "0 auto" }}>
      <aside style={{ padding: "30px 20px", borderRight: "1px solid var(--line)" }}>
        <h3 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 14 }}>
          Favorite Cities
        </h3>
        {favorites.map((f, i) => (
          <div
            key={f}
            onClick={() => setActive(i)}
            style={{
              padding: "10px 12px",
              background: i === active ? "var(--ink)" : "var(--haze)",
              color: i === active ? "var(--paper)" : "var(--ink)",
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            {f} <span>●</span>
          </div>
        ))}
        {!isAuthenticated && (
          <div style={{ fontSize: 11, color: "#8a938d", marginTop: 10 }}>
            <a href="/login" style={{ color: "var(--slate)" }}>Log in</a> to save your own favorites.
          </div>
        )}
      </aside>

      <main style={{ padding: "30px" }}>
        <h1 className="display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 20 }}>{city}</h1>

        {loading || !current ? (
          <div style={{ fontSize: 13, color: "#5a655f" }}>Loading live data…</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 18 }}>
              <div style={{ background: "var(--haze)", borderRadius: 6, padding: 20 }}>
                <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 14 }}>Current AQI</h4>
                <div className="mono" style={{ fontSize: 40, fontWeight: 600 }}>{current.aqi}</div>
                <span className={`cat-tag ${cat.tone}`} style={{ marginTop: 8 }}>{cat.label}</span>
              </div>

              <div style={{ background: "var(--haze)", borderRadius: 6, padding: 20 }}>
                <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 14 }}>Pollutants</h4>
                {[["PM2.5", current.pm25], ["PM10", current.pm10], ["NO2", current.no2], ["O3", current.o3]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                    {k} <span className="mono" style={{ fontWeight: 600 }}>{v?.toFixed ? v.toFixed(1) : v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--haze)", borderRadius: 6, padding: 20 }}>
                <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 14 }}>Weather</h4>
                {weather && [["Temp", `${weather.temperature}°C`], ["Humidity", `${weather.humidity}%`], ["Wind", `${weather.wind_speed} km/h`]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                    {k} <span className="mono" style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 18 }}>
              <div style={{ background: "var(--haze)", borderRadius: 6, padding: "20px 20px 10px" }}>
                <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 14 }}>AQI Trend — 7 Days</h4>
                <svg viewBox="0 0 600 180" width="100%" height="180" preserveAspectRatio="none">
                  <polyline
                    points={chartPoints.map((p, i) => {
                      const x = (i / Math.max(chartPoints.length - 1, 1)) * 560 + 10;
                      const y = 150 - ((p.aqi - minAqi) / Math.max(maxAqi - minAqi, 1)) * 110;
                      return `${x},${y}`;
                    }).join(" ")}
                    fill="none" stroke="#2B4C5E" strokeWidth="3"
                  />
                </svg>
              </div>

              <div style={{ background: "#fdf1e2", borderRadius: 6, padding: 20 }}>
                <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#8a6420", marginBottom: 14 }}>Forecast</h4>
                {forecast && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: "#5a4626" }}>Next day</span>
                      <span className="mono" style={{ fontWeight: 600, fontSize: 20, color: "var(--warn)" }}>{forecast.predicted_aqi}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#5a4626", marginTop: 14, lineHeight: 1.5 }}>
                      {adviceFor(forecast.predicted_aqi)}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ background: "var(--haze)", borderRadius: 6, padding: 20 }}>
              <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 16 }}>City Comparison</h4>
              {compare.map((c) => {
                const ccat = categoryFor(c.aqi);
                const color = ccat.tone === "good" ? "var(--good)" : ccat.tone === "warn" ? "var(--warn)" : "var(--danger)";
                return (
                  <div key={c.city} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 12 }}>
                    <div style={{ width: 70 }}>{c.city}</div>
                    <div style={{ height: 16, borderRadius: 3, width: Math.min(c.aqi, 300), background: color }} />
                    <div className="mono" style={{ fontWeight: 600, marginLeft: 8 }}>{c.aqi}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
