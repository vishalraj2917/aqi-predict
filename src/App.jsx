import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Prediction from "./pages/Prediction";
import MapPage from "./pages/MapPage";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Login from "./pages/Login";

export default function App() {
  return (
    <AuthProvider>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/prediction" element={<Prediction />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </AuthProvider>
  );
}
