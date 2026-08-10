import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { getAlerts, setAlertPreference } from "../lib/api";

export default function Alerts() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [city, setCity] = useState("Chennai");
  const [threshold, setThreshold] = useState(150);
  const [emailOn, setEmailOn] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getAlerts().then(setAlerts).catch((e) => setError(e.message));
  }, [isAuthenticated]);

  const save = async () => {
    try {
      await setAlertPreference(city, Number(threshold), emailOn);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <main style={{ maxWidth: 600, margin: "60px auto", padding: "0 40px", textAlign: "center" }}>
        <h1 className="display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 14 }}>
          Log in to manage alerts
        </h1>
        <button
          onClick={() => navigate("/login")}
          style={{ padding: "12px 22px", background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Go to login
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 40px 60px" }}>
      <h1 className="display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>
        Alerts
      </h1>
      <div style={{ fontSize: 13, color: "#5a655f", marginBottom: 26 }}>
        Manage notification thresholds. Note: alerts are stored via the real API, but nothing triggers/sends them
        automatically yet — that needs a scheduled job (see aqi-backend/README.md).
      </div>

      {error && (
        <div style={{ background: "#f3dcd8", color: "var(--danger)", padding: 14, borderRadius: 6, fontSize: 12, marginBottom: 18 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
        <div>
          {alerts.length === 0 ? (
            <div style={{ background: "var(--haze)", borderRadius: 6, padding: 30, textAlign: "center", color: "#5a655f", fontSize: 13 }}>
              No alerts yet — set a threshold to get notified.
            </div>
          ) : (
            alerts.map((a) => (
              <div key={a.id} style={{ background: "var(--haze)", borderRadius: 6, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: "#5a655f" }}>{new Date(a.date).toLocaleString()}</div>
                </div>
                <span className={`cat-tag ${a.severity}`}>{a.severity}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ background: "var(--haze)", borderRadius: 6, padding: 22, height: "fit-content" }}>
          <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 18 }}>
            Set New Alert
          </h4>

          <label style={{ fontSize: 12, color: "#5a655f", display: "block", marginBottom: 6 }}>City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} style={{ width: "100%", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 6, padding: "10px 12px", fontSize: 13, marginBottom: 16 }}>
            <option>Chennai</option><option>Delhi</option><option>Mumbai</option><option>Bengaluru</option>
          </select>

          <label style={{ fontSize: 12, color: "#5a655f", display: "block", marginBottom: 6 }}>
            Threshold AQI — <span className="mono" style={{ fontWeight: 600 }}>{threshold}</span>
          </label>
          <input type="range" min="50" max="300" value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ width: "100%", marginBottom: 16 }} />

          <label style={{ fontSize: 12, color: "#5a655f", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} />
            Email me when threshold is crossed
          </label>

          <button onClick={save} style={{ width: "100%", padding: "12px", background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saved ? "Saved ✓" : "Save Alert"}
          </button>
        </div>
      </div>
    </main>
  );
}
