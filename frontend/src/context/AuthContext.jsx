import { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";

const AuthContext = createContext(null);

const DEFAULT_PERMS = { permissions: {}, modules: [] };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perms, setPerms] = useState(DEFAULT_PERMS);
  const [loading, setLoading] = useState(true);

  const loadPerms = async () => {
    try { const { data } = await api.get("/auth/permissions"); setPerms(data); }
    catch { setPerms(DEFAULT_PERMS); }
  };

  useEffect(() => {
    (async () => {
      const t = localStorage.getItem("linchub_token");
      if (!t) { setLoading(false); return; }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
        await loadPerms();
      } catch (e) {
        localStorage.removeItem("linchub_token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("linchub_token", data.token);
      setUser(data.user);
      await loadPerms();
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: formatApiError(e) };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("linchub_token");
    setUser(null);
    setPerms(DEFAULT_PERMS);
  };

  const can = (module, perm) => {
    if (!user) return false;
    if (user.role === "super_admin") return true;
    return !!perms.permissions?.[module]?.[perm];
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, perms, refreshPerms: loadPerms, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
