import { useEffect, useState } from "react";
import BreathLine from "../components/BreathLine";
import { categoryFor } from "../lib/aqi";
import { compareCities, getHistory } from "../lib/api";

const DEFAULT_CITIES = ["Delhi", "Chennai", "Bengaluru", "Mumbai"];

export default function Home() {
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState([]);
  const [breathPoints, setBreathPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cmp, hist] = await Promise.all([
          compareCities(DEFAULT_CITIES),
          getHistory("Coimbatore", 24),
        ]);
        if (cancelled) return;
        setCities(cmp.cities);

        const vals = hist.points.map((p) => p.aqi);
        const max = Math.max(...vals, 1);
        const min = Math.min(...vals);
        const points = hist.points.map((p, i) => ({
          x: (i / Math.max(hist.points.length - 1, 1)) * 1000,
          y: 85 - ((p.aqi - min) / Math.max(max - min, 1)) * 65,
        }));
        setBreathPoints(points);
        setApiError(null);
      } catch (e) {
        if (!cancelled) setApiError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px 60px" }}>
        <h1 className="display" style={{ fontSize: 56, fontWeight: 600, lineHeight: 1.05, maxWidth: 760 }}>
          Know your air before you breathe it.
        </h1>
        <p style={{ fontSize: 16, color: "#3d4a44", marginTop: 18, maxWidth: 520 }}>
          Forecast AQI for your city up to 24 hours ahead, with plain-language
          advice on when it's safe to go outside.
        </p>

        <div style={{ marginTop: 32, display: "flex", maxWidth: 420 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a city — try Coimbatore"
            style={{
              flex: 1,
              padding: "14px 16px",
              border: "1px solid var(--ink)",
              borderRight: "none",
              fontFamily: "Inter",
              fontSize: 14,
              background: "var(--paper)",
            }}
          />
          <button
            style={{
              padding: "14px 22px",
              background: "var(--ink)",
              color: "var(--paper)",
              border: "1px solid var(--ink)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </div>

        {apiError && (
          <div style={{ marginTop: 20, fontSize: 12, color: "var(--danger)", background: "#f3dcd8", padding: "10px 14px", borderRadius: 6, maxWidth: 480 }}>
            Couldn't reach the backend ({apiError}). Make sure it's running at http://127.0.0.1:8000 — see aqi-backend/README.md.
          </div>
        )}

        {breathPoints.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <BreathLine points={breathPoints} label="Last 24 hours — Coimbatore" />
          </div>
        )}
      </section>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "50px 40px" }}>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 22 }}>
          Live AQI Overview
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
          {loading && DEFAULT_CITIES.map((name) => (
            <div key={name} style={{ background: "var(--haze)", padding: 20, borderRadius: 6, opacity: 0.5 }}>
              <div style={{ fontSize: 13, marginBottom: 14 }}>{name}</div>
              <div className="mono" style={{ fontSize: 34, fontWeight: 600 }}>···</div>
            </div>
          ))}
          {!loading && cities.map((c) => {
            const cat = categoryFor(c.aqi);
            return (
              <div key={c.city} style={{ background: "var(--haze)", padding: 20, borderRadius: 6 }}>
                <div style={{ fontSize: 13, color: "#4a5750", marginBottom: 14 }}>{c.city}</div>
                <div className={`mono ${cat.tone}`} style={{ fontSize: 34, fontWeight: 600 }}>{c.aqi}</div>
                <div className={`${cat.tone}`} style={{ fontSize: 11, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                  {cat.label}
                </div>
                <div className={`bg-${cat.tone}`} style={{ height: 3, width: 36, marginTop: 12, borderRadius: 2 }} />
              </div>
            );
          })}
        </div>
      </section>

      <footer style={{ background: "var(--haze)", padding: "28px 40px", textAlign: "center", fontSize: 12, color: "#5a655f", marginTop: 40 }}>
        About · Contact · GitHub · © AQI Predict
      </footer>
    </>
  );
}
