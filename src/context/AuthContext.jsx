import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ensureSupabaseClient, supabase } from "../services/supabaseClient";
import { api } from "../services/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roleProfile, setRoleProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const data = await api.get("/auth/me");
      setProfile(data.profile || null);
      setRoleProfile(data.roleProfile || null);
      return data.profile;
    } catch {
      setProfile(null);
      setRoleProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    let subscription;

    async function init() {
      try {
        const client = await ensureSupabaseClient().catch(() => null);
        if (client && active) {
          const { data } = client.auth.onAuthStateChange(async (_event, session) => {
            if (!active) return;
            if (session?.user) {
              setUser(session.user);
              localStorage.setItem("alumsync_access_token", session.access_token);
              await loadMe();
            } else {
              setUser(null);
              setProfile(null);
              setRoleProfile(null);
              localStorage.removeItem("alumsync_access_token");
            }
            setLoading(false);
          });
          subscription = data?.subscription;

          const { data: sessionData } = await client.auth.getSession();
          if (sessionData?.session?.user && active) {
            setUser(sessionData.session.user);
            localStorage.setItem("alumsync_access_token", sessionData.session.access_token);
            await loadMe();
          }
        } else {
          const storedToken = localStorage.getItem("alumsync_access_token");
          if (storedToken && active) {
            const prof = await loadMe();
            if (prof) setUser({ id: prof.id, email: prof.email });
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    init();

    return () => {
      active = false;
      subscription?.unsubscribe?.();
    };
  }, [loadMe]);

  const login = async ({ email, password }) => {
    const data = await api.post("/auth/login", { email, password });
    if (data.session?.access_token) {
      localStorage.setItem("alumsync_access_token", data.session.access_token);
      if (supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
    }
    setUser(data.user);
    setProfile(data.profile);
    await loadMe();
    return data;
  };

  const signup = async ({ firstName, lastName, email, password, role, adminInviteCode }) => {
    const data = await api.post("/auth/signup", {
      firstName,
      lastName,
      email,
      password,
      role,
      adminInviteCode,
    });
    if (data.session?.access_token) {
      localStorage.setItem("alumsync_access_token", data.session.access_token);
      if (supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      setUser(data.user);
      setProfile(data.profile);
      await loadMe();
    }
    return data;
  };

  const logout = async () => {
    localStorage.removeItem("alumsync_access_token");
    localStorage.removeItem("alumsync_pending_oauth_role");
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setRoleProfile(null);
  };

  const loginWithOAuth = async (provider, { role } = {}) => {
    const client = await ensureSupabaseClient();
    if (role === "student" || role === "alumni") {
      localStorage.setItem("alumsync_pending_oauth_role", role);
    } else {
      localStorage.removeItem("alumsync_pending_oauth_role");
    }

    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const syncOAuthProfile = useCallback(async () => {
    const client = await ensureSupabaseClient();
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData?.session;
    if (!session?.access_token) {
      throw new Error("No active OAuth session found.");
    }
    localStorage.setItem("alumsync_access_token", session.access_token);
    const requestedRole = localStorage.getItem("alumsync_pending_oauth_role") || undefined;
    localStorage.removeItem("alumsync_pending_oauth_role");

    const data = await api.post("/auth/oauth-sync", { requestedRole });
    setUser(session.user);
    setProfile(data.profile || null);
    setRoleProfile(data.roleProfile || null);
    return data;
  }, []);

  const forgotPassword = async (email) => {
    return api.post("/auth/forgot-password", { email });
  };

  const resetPassword = async (newPassword) => {
    const client = await ensureSupabaseClient();
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roleProfile,
        loading,
        isAuthenticated: Boolean(user && profile),
        login,
        signup,
        logout,
        loginWithOAuth,
        syncOAuthProfile,
        forgotPassword,
        resetPassword,
        refreshProfile: loadMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
