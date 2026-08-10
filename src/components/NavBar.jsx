import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/prediction", label: "Prediction" },
  { to: "/map", label: "Map" },
  { to: "/analytics", label: "Analytics" },
  { to: "/alerts", label: "Alerts" },
  { to: "/profile", label: "Profile" },
  { to: "/about", label: "About" },
];

export default function NavBar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          padding: "18px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="display" style={{ fontWeight: 600, fontSize: 20 }}>
          AQI Predict
        </div>
        <nav style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                fontSize: 13,
                opacity: isActive ? 1 : 0.85,
                borderBottom: isActive ? "1px solid var(--warn)" : "none",
                paddingBottom: 2,
              })}
            >
              {l.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <span
              onClick={() => { logout(); navigate("/"); }}
              style={{ fontSize: 13, cursor: "pointer", opacity: 0.85, marginLeft: 6 }}
            >
              Log out
            </span>
          ) : (
            <NavLink
              to="/login"
              style={({ isActive }) => ({
                fontSize: 13,
                background: "var(--paper)",
                color: "var(--ink)",
                padding: "6px 14px",
                borderRadius: 6,
                fontWeight: 600,
                marginLeft: 6,
                opacity: isActive ? 0.8 : 1,
              })}
            >
              Log in
            </NavLink>
          )}
        </nav>
      </header>
      <div
        style={{
          height: 3,
          background:
            "linear-gradient(90deg, var(--good), var(--warn), var(--danger))",
        }}
      />
    </>
  );
}
