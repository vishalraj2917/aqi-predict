import { useEffect, useState } from "react";
import { categoryFor } from "../lib/aqi";
import { getAnalytics } from "../lib/api";

const CITIES = ["Delhi", "Mumbai", "Chennai", "Bengaluru", "Kolkata", "Coimbatore"];
const seasonColor = { Winter: "var(--danger)", Summer: "var(--warn)", Monsoon: "var(--good)", Autumn: "var(--warn)" };

export default function Analytics() {
  const [city, setCity] = useState("Delhi");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAnalytics(city)
      .then((res) => { if (!cancelled) { setData(res); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city]);

  if (error) {
    return (
      <main style={{ maxWidth: 700, margin: "60px auto", padding: "0 40px" }}>
        <div style={{ background: "#f3dcd8", color: "var(--danger)", padding: 20, borderRadius: 6, fontSize: 13 }}>
          Couldn't reach the backend ({error}). Make sure it's running at http://127.0.0.1:8000.
        </div>
      </main>
    );
  }

  const maxMonthly = data ? Math.max(...data.monthly.map((d) => d.avg_aqi)) : 1;
  const maxSeasonal = data ? Math.max(...data.seasonal.map((d) => d.avg_aqi)) : 1;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 40px 60px" }}>
      <h1 className="display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>
        Analytics
      </h1>
      <div style={{ fontSize: 13, color: "#5a655f", marginBottom: 20 }}>
        Real monthly/seasonal averages computed from stored history, via /api/aqi/analytics.
      </div>

      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        style={{ background: "var(--haze)", border: "none", borderRadius: 6, padding: "10px 14px", fontFamily: "Inter", fontSize: 13, marginBottom: 26 }}
      >
        {CITIES.map((c) => <option key={c}>{c}</option>)}
      </select>

      {loading || !data ? (
        <div style={{ fontSize: 13, color: "#5a655f" }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 18 }}>
            <div style={{ background: "var(--haze)", borderRadius: 6, padding: 22 }}>
              <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 18 }}>
                Monthly Average AQI — {city}
              </h4>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
                {data.monthly.map((d) => (
                  <div key={d.month} style={{ textAlign: "center", flex: 1 }}>
                    <div className="mono" style={{ height: (d.avg_aqi / maxMonthly) * 130, background: "var(--slate)", borderRadius: "3px 3px 0 0" }} />
                    <div style={{ fontSize: 10, marginTop: 8, color: "#5a655f" }}>{d.month}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--haze)", borderRadius: 6, padding: 22 }}>
              <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 18 }}>
                Seasonal Breakdown
              </h4>
              {data.seasonal.map((s) => (
                <div key={s.season} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>{s.season}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{s.avg_aqi}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--paper)", borderRadius: 4 }}>
                    <div style={{ height: 8, width: `${(s.avg_aqi / maxSeasonal) * 100}%`, background: seasonColor[s.season], borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--haze)", borderRadius: 6, padding: 22 }}>
            <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 16 }}>
              City Comparison Table
            </h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  {["City", "AQI", "Category", "PM2.5", "PM10"].map((h) => (
                    <th key={h} style={{ padding: "8px 0", fontWeight: 600, color: "#5a655f", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.table.map((r) => {
                  const cat = categoryFor(r.aqi);
                  return (
                    <tr key={r.city} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 0" }}>{r.city}</td>
                      <td className="mono" style={{ padding: "10px 0", fontWeight: 600 }}>{r.aqi}</td>
                      <td style={{ padding: "10px 0" }}><span className={`cat-tag ${cat.tone}`}>{r.category}</span></td>
                      <td className="mono" style={{ padding: "10px 0" }}>{r.pm25}</td>
                      <td className="mono" style={{ padding: "10px 0" }}>{r.pm10}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
