import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { loginUser, registerUser, error } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = mode === "login" ? await loginUser(email, password) : await registerUser(name, email, password);
    setSubmitting(false);
    if (ok) navigate("/dashboard");
  };

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "60px 40px" }}>
      <h1 className="display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>
        {mode === "login" ? "Log in" : "Create account"}
      </h1>
      <div style={{ fontSize: 13, color: "#5a655f", marginBottom: 26 }}>
        {mode === "login" ? "Access your favorite cities and alerts." : "Save favorite cities and get AQI alerts."}
      </div>

      <form onSubmit={submit} style={{ background: "var(--haze)", borderRadius: 6, padding: 24 }}>
        {mode === "register" && (
          <>
            <label style={{ fontSize: 12, color: "#5a655f", display: "block", marginBottom: 6 }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 6, marginBottom: 14, fontSize: 13 }}
            />
          </>
        )}

        <label style={{ fontSize: 12, color: "#5a655f", display: "block", marginBottom: 6 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 6, marginBottom: 14, fontSize: 13 }}
        />

        <label style={{ fontSize: 12, color: "#5a655f", display: "block", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 6, marginBottom: 18, fontSize: 13 }}
        />

        {error && <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 14 }}>{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          style={{ width: "100%", padding: "12px", background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 13, textAlign: "center" }}>
        {mode === "login" ? (
          <>Don't have an account? <span onClick={() => setMode("register")} style={{ color: "var(--slate)", cursor: "pointer", fontWeight: 600 }}>Register</span></>
        ) : (
          <>Already have an account? <span onClick={() => setMode("login")} style={{ color: "var(--slate)", cursor: "pointer", fontWeight: 600 }}>Log in</span></>
        )}
      </div>

      <div style={{ marginTop: 24, fontSize: 11, color: "#8a938d", textAlign: "center" }}>
        Requires the backend running at http://127.0.0.1:8000
      </div>
    </main>
  );
}
