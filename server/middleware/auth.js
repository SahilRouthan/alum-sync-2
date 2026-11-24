import { supabaseAdmin, isSupabaseConfigured } from "../config/supabase.js";

export function requireSupabase(req, res, next) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return res.status(503).json({
      error: "Database not configured",
      message:
        "Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) are not configured.",
    });
  }
  return next();
}

export async function requireAuth(req, res, next) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return res.status(503).json({
      error: "Authentication service unavailable",
      message: "Supabase is not configured on the server.",
    });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired session token" });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "User profile record not found" });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: "Account is deactivated. Contact administrator." });
    }

    req.user = data.user;
    req.profile = profile;
    req.accessToken = token;
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireRole(...allowedRoles) {
  const normalized = allowedRoles.map((r) => String(r).toLowerCase());
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!normalized.includes(req.profile.role)) {
      return res.status(403).json({
        error: "Access denied",
        message: `This action requires one of the following roles: ${normalized.join(", ")}`,
      });
    }
    return next();
  };
}
