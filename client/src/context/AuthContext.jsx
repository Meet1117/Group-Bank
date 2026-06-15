import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { disconnectSocket } from "../lib/socket";
import { registerPush } from "../lib/push";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem("gb_token"));
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("gb_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Hydrate user from /auth/me on mount when a token is present.
  useEffect(() => {
    let active = true;

    async function hydrate() {
      const stored = localStorage.getItem("gb_token");
      if (!stored) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        if (!active) return;
        setUser(data.user);
        localStorage.setItem("gb_user", JSON.stringify(data.user));
      } catch {
        if (!active) return;
        localStorage.removeItem("gb_token");
        localStorage.removeItem("gb_user");
        setToken(null);
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    hydrate();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    localStorage.setItem("gb_token", data.token);
    localStorage.setItem("gb_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    // Best-effort push registration.
    registerPush();

    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gb_token");
    localStorage.removeItem("gb_user");
    setToken(null);
    setUser(null);
    disconnectSocket();
    navigate("/login");
  }, [navigate]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
