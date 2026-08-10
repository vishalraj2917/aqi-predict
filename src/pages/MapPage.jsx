import { useEffect, useState } from "react";
import { categoryFor } from "../lib/aqi";
import { getMapData } from "../lib/api";

const dotColor = (tone) =>
  tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--danger)";

// Rough India bounding box, used only to place dots on the placeholder grid.
// Swap this whole component for Leaflet/Google Maps + real tiles when you
// integrate a real map provider — lat/lon from the API is already real.
const BOUNDS = { latMin: 8, latMax: 35, lonMin: 68, lonMax: 92 };

function project(lat, lon) {
  const x = ((lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * 100;
  const y = 100 - ((lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * 100;
  return { x: `${x}%`, y: `${y}%` };
}

export default function MapPage() {
  const [cities, setCities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMapData()
      .then((res) => setCities(res.cities))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <main style={{ maxWidth: 700, margin: "60px auto", padding: "0 40px" }}>
        <div style={{ background: "#f3dcd8", color: "var(--danger)", padding: 20, borderRadius: 6, fontSize: 13 }}>
          Couldn't reach the backend ({error}). Make sure it's running at http://127.0.0.1:8000.
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 40px 60px" }}>
      <h1 className="display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>
        Pollution Map
      </h1>
      <div style={{ fontSize: 13, color: "#5a655f", marginBottom: 26 }}>
        Real coordinates from the backend, plotted on a simplified grid. Click a marker for details.
      </div>

      <div style={{ position: "relative", background: "var(--haze)", borderRadius: 6, height: 460, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, var(--line) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, var(--line) 40px)",
            opacity: 0.5,
          }}
        />
        {loading && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#5a655f" }}>Loading map data…</div>}
        {cities.map((c) => {
          const pos = project(c.lat, c.lon);
          const isActive = selected?.city === c.city;
          return (
            <div
              key={c.city}
              onClick={() => setSelected(c)}
              title={c.city}
              style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%, -50%)", cursor: "pointer" }}
            >
              <div
                style={{
                  width: isActive ? 22 : 16, height: isActive ? 22 : 16, borderRadius: "50%",
                  background: dotColor(categoryFor(c.aqi).tone),
                  border: "2px solid var(--paper)", boxShadow: "0 2px 6px rgba(16,32,28,0.3)",
                  transition: "all .15s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
        <div style={{ display: "flex", gap: 18, fontSize: 12, color: "#5a655f" }}>
          <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--good)", marginRight: 6 }} />Good</span>
          <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--warn)", marginRight: 6 }} />Moderate / Unhealthy (SG)</span>
          <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--danger)", marginRight: 6 }} />Unhealthy+</span>
        </div>

        <div style={{ background: "var(--haze)", borderRadius: 6, padding: 18 }}>
          {selected ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{selected.city}</div>
              <div className="mono" style={{ fontSize: 30, fontWeight: 600 }}>{selected.aqi}</div>
              <span className={`cat-tag ${categoryFor(selected.aqi).tone}`} style={{ marginTop: 8 }}>{selected.category}</span>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#5a655f" }}>Select a city marker to see details.</div>
          )}
        </div>
      </div>
    </main>
  );
}
