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
  // Only show the full-screen loader when we have a token but NO cached user
  // to render. If a cached user exists, render instantly and validate in the
  // background — this prevents the "stuck loader" when the backend is waking up.
  const [loading, setLoading] = useState(() => {
    return (
      !!localStorage.getItem("gb_token") && !localStorage.getItem("gb_user")
    );
  });

  // Hydrate / re-validate the user from /auth/me on mount when a token exists.
  useEffect(() => {
    let active = true;
    const stored = localStorage.getItem("gb_token");
    if (!stored) {
      setLoading(false);
      return undefined;
    }

    // Safety net: never let the loader hang (slow / cold-starting backend).
    const safety = setTimeout(() => {
      if (active) setLoading(false);
    }, 6000);

    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        if (!active) return;
        setUser(data.user);
        localStorage.setItem("gb_user", JSON.stringify(data.user));
      } catch (err) {
        // Only log out on a real auth failure. On a network/timeout error
        // (e.g. backend waking up) keep the cached session so the app works.
        const status = err?.response?.status;
        if (active && (status === 401 || status === 403)) {
          localStorage.removeItem("gb_token");
          localStorage.removeItem("gb_user");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
        clearTimeout(safety);
      }
    })();

    return () => {
      active = false;
      clearTimeout(safety);
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
    localStorage.removeItem("gb_rooms_v1");
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
