export default function About() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "60px 40px 80px" }}>
      <h1 className="display" style={{ fontSize: 32, fontWeight: 600, marginBottom: 18 }}>
        About AQI Predict
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "#2b332f", marginBottom: 18 }}>
        AQI Predict is a full-stack AI web application that forecasts air
        quality using historical pollution and weather data. It combines a
        machine learning prediction layer with a live dashboard, interactive
        maps, and alerting — built as a final-year engineering project
        demonstrating time-series forecasting, environmental data analysis,
        and full-stack development.
      </p>

      <h2 className="display" style={{ fontSize: 20, fontWeight: 600, marginTop: 34, marginBottom: 14 }}>
        Tech Stack
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {[
          ["Frontend", "React (Vite), React Router"],
          ["Backend", "FastAPI (Python)"],
          ["Database", "PostgreSQL"],
          ["ML", "Scikit-learn, XGBoost"],
          ["Charts", "Custom SVG / Recharts"],
          ["Maps", "Leaflet / Google Maps"],
        ].map(([k, v]) => (
          <div key={k} style={{ background: "var(--haze)", borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 6 }}>{k}</div>
            <div style={{ fontSize: 13 }}>{v}</div>
          </div>
        ))}
      </div>

      <h2 className="display" style={{ fontSize: 20, fontWeight: 600, marginTop: 34, marginBottom: 14 }}>
        Project Links
      </h2>
      <div style={{ fontSize: 13, color: "var(--slate)" }}>
        GitHub Repository · Project Report (PDF) · Contact
      </div>
    </main>
  );
}
