import { useEffect, useState } from "react";
import { categoryFor } from "../lib/aqi";
import { predictAQI, getHistory } from "../lib/api";

const horizons = [1, 24];
const horizonLabels = { 1: "Next Hour", 24: "Next Day" };
const cities = ["Chennai", "Delhi", "Mumbai", "Bengaluru", "Kolkata", "Coimbatore"];

export default function Prediction() {
  const [horizon, setHorizon] = useState(24);
  const [city, setCity] = useState("Chennai");
  const [forecast, setForecast] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [fc, hist] = await Promise.all([
          predictAQI(city, horizon),
          getHistory(city, 24 * 7),
        ]);
        if (cancelled) return;
        setForecast(fc);
        setHistory(hist.points);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [city, horizon]);

  if (error) {
    return (
      <main style={{ maxWidth: 700, margin: "60px auto", padding: "0 40px" }}>
        <div style={{ background: "#f3dcd8", color: "var(--danger)", padding: 20, borderRadius: 6, fontSize: 13 }}>
          Couldn't reach the backend ({error}). Make sure it's running at http://127.0.0.1:8000 — see aqi-backend/README.md.
        </div>
      </main>
    );
  }

  const cat = forecast ? categoryFor(forecast.predicted_aqi) : null;
  const maxAqi = history.length ? Math.max(...history.map((p) => p.aqi)) : 1;
  const minAqi = history.length ? Math.min(...history.map((p) => p.aqi)) : 0;
  const chartPts = history.filter((_, i) => i % Math.ceil(history.length / 40 || 1) === 0);
  const predPoint = forecast
    ? { aqi: forecast.predicted_aqi }
    : null;
  const fullSeries = predPoint ? [...chartPts, predPoint] : chartPts;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 40px 60px" }}>
      <h1 className="display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>
        Prediction — {city}
      </h1>
      <div style={{ fontSize: 13, color: "#5a655f", marginBottom: 26 }}>
        Real forecast from the trained model — see aqi-ml/README.md for how it was built and evaluated.
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 26 }}>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ background: "var(--haze)", border: "none", borderRadius: 6, padding: "10px 14px", fontFamily: "Inter", fontSize: 13, color: "var(--ink)" }}
        >
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>

        <div style={{ display: "flex", background: "var(--haze)", borderRadius: 6, overflow: "hidden" }}>
          {horizons.map((h) => (
            <span
              key={h}
              onClick={() => setHorizon(h)}
              style={{
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: h === horizon ? "var(--ink)" : "transparent",
                color: h === horizon ? "var(--paper)" : "#5a655f",
              }}
            >
              {horizonLabels[h]}
            </span>
          ))}
        </div>
      </div>

      {loading || !forecast ? (
        <div style={{ fontSize: 13, color: "#5a655f" }}>Running the model…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ background: "var(--ink)", color: "var(--paper)", borderRadius: 6, padding: 26 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, opacity: 0.7, marginBottom: 10 }}>
                Predicted AQI · {horizonLabels[horizon]}
              </div>
              <div className="mono" style={{ fontSize: 64, fontWeight: 600, lineHeight: 1 }}>{forecast.predicted_aqi}</div>
              <span className={`cat-tag ${cat.tone}`} style={{ marginTop: 14 }}>{cat.label}</span>
              <div style={{ marginTop: 20, fontSize: 12, opacity: 0.75 }}>
                Model confidence — {Math.round(forecast.confidence * 100)}%
                <div style={{ height: 5, background: "rgba(246,245,240,0.2)", borderRadius: 3, marginTop: 6 }}>
                  <div style={{ height: 5, width: `${forecast.confidence * 100}%`, background: "var(--warn)", borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 11, opacity: 0.6 }}>
                For: {new Date(forecast.predicted_for).toLocaleString()}
              </div>
            </div>

            <div style={{ background: "var(--haze)", borderRadius: 6, padding: 22 }}>
              <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 16 }}>
                Actual (7 days) + Predicted Point
              </h4>
              <svg viewBox="0 0 700 200" width="100%" height="200" preserveAspectRatio="none">
                <polyline
                  points={fullSeries.map((p, i) => {
                    const x = (i / Math.max(fullSeries.length - 1, 1)) * 660 + 10;
                    const y = 170 - ((p.aqi - minAqi) / Math.max(maxAqi - minAqi, 1)) * 140;
                    return `${x},${y}`;
                  }).join(" ")}
                  fill="none" stroke="#2B4C5E" strokeWidth="2.5"
                />
                <circle
                  cx={660 + 10}
                  cy={170 - ((forecast.predicted_aqi - minAqi) / Math.max(maxAqi - minAqi, 1)) * 140}
                  r="5" fill="#C98A2E"
                />
              </svg>
              <div style={{ display: "flex", gap: 18, fontSize: 11, color: "#5a655f", marginTop: 10 }}>
                <span><i style={{ width: 8, height: 8, borderRadius: "50%", background: "#2B4C5E", display: "inline-block", marginRight: 6 }} />Actual</span>
                <span><i style={{ width: 8, height: 8, borderRadius: "50%", background: "#C98A2E", display: "inline-block", marginRight: 6 }} />Predicted</span>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
