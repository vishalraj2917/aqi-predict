import { createContext, useContext, useEffect, useState } from "react";
import * as api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("aqi_token"));
  const [error, setError] = useState(null);

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  const loginUser = async (email, password) => {
    setError(null);
    try {
      const res = await api.login(email, password);
      setTokenState(res.access_token);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const registerUser = async (name, email, password) => {
    setError(null);
    try {
      await api.register(name, email, password);
      return loginUser(email, password);
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const logout = () => setTokenState(null);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, loginUser, registerUser, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
