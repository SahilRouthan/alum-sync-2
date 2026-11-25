import { createClient } from "@supabase/supabase-js";

const buildUrl = import.meta.env.VITE_SUPABASE_URL;
const buildAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export const isFrontendSupabaseConfigured = Boolean(
  buildUrl &&
    buildAnonKey &&
    !buildUrl.includes("your-project-id") &&
    !buildAnonKey.includes("your-supabase")
);

function buildClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export let supabase = isFrontendSupabaseConfigured ? buildClient(buildUrl, buildAnonKey) : null;

let pendingInit = null;

export async function ensureSupabaseClient() {
  if (supabase) return supabase;
  if (pendingInit) return pendingInit;

  pendingInit = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/config`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Supabase configuration unavailable on server.");
      }
      const cfg = await res.json();
      if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
        throw new Error("Supabase configuration response was incomplete.");
      }
      supabase = buildClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      return supabase;
    } finally {
      pendingInit = null;
    }
  })();

  return pendingInit;
}
