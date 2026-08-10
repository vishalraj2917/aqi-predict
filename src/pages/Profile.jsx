import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { getFavorites, addFavorite, removeFavorite } from "../lib/api";

export default function Profile() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [newCity, setNewCity] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getFavorites().then((res) => setFavorites(res.favorites || [])).catch((e) => setError(e.message));
  }, [isAuthenticated]);

  const addCity = async () => {
    if (!newCity.trim()) return;
    try {
      await addFavorite(newCity.trim());
      setFavorites([...favorites, newCity.trim()]);
      setNewCity("");
    } catch (e) {
      setError(e.message);
    }
  };

  const removeCity = async (city) => {
    try {
      await removeFavorite(city);
      setFavorites(favorites.filter((c) => c !== city));
    } catch (e) {
      setError(e.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <main style={{ maxWidth: 600, margin: "60px auto", padding: "0 40px", textAlign: "center" }}>
        <h1 className="display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 14 }}>
          Log in to view your profile
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
        Profile
      </h1>
      <div style={{ fontSize: 13, color: "#5a655f", marginBottom: 26 }}>
        Manage your favorite cities. Backed by the real /api/favorites endpoint.
      </div>

      {error && (
        <div style={{ background: "#f3dcd8", color: "var(--danger)", padding: 14, borderRadius: 6, fontSize: 12, marginBottom: 18 }}>
          {error}
        </div>
      )}

      <div style={{ background: "var(--haze)", borderRadius: 6, padding: 22, maxWidth: 460 }}>
        <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a655f", marginBottom: 18 }}>
          Favorite Cities
        </h4>
        {favorites.length === 0 && <div style={{ fontSize: 13, color: "#5a655f", marginBottom: 12 }}>No favorites yet.</div>}
        {favorites.map((c) => (
          <div key={c} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: 13 }}>{c}</span>
            <span onClick={() => removeCity(c)} style={{ fontSize: 12, color: "var(--danger)", cursor: "pointer" }}>Remove</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="e.g. Delhi"
            style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }}
          />
          <button onClick={addCity} style={{ padding: "10px 16px", background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
            Add
          </button>
        </div>
      </div>
    </main>
  );
}
