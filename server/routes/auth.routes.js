import express from "express";
import { supabaseAdmin, supabasePublic } from "../config/supabase.js";
import { requireAuth, requireRole, requireSupabase } from "../middleware/auth.js";
import { normalizeEmail, normalizePersonName, sanitizeText } from "../utils/normalize.js";
import { isValidEmail } from "../utils/validation.js";

const router = express.Router();

router.post("/signup", requireSupabase, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const firstName = normalizePersonName(sanitizeText(req.body.firstName || req.body.first_name, 80));
    const lastName = normalizePersonName(sanitizeText(req.body.lastName || req.body.last_name, 80));
    const requestedRole = String(req.body.role || "student").trim().toLowerCase();
    const adminInviteCode = String(req.body.adminInviteCode || "").trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (!firstName) {
      return res.status(400).json({ error: "First name is required." });
    }

    // Security: Prevent public privilege escalation to 'admin'
    let safeRole = "student";
    if (requestedRole === "alumni") {
      safeRole = "alumni";
    } else if (requestedRole === "admin") {
      const expectedCode = process.env.ADMIN_INVITE_CODE;
      if (!expectedCode || adminInviteCode !== expectedCode) {
        return res.status(403).json({
          error: "Administrator accounts cannot be self-registered without an institutional invite code.",
        });
      }
      safeRole = "admin";
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        role: safeRole,
      },
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    // Ensure profile & role record exist even if trigger ran or admin role requested
    if (safeRole === "admin") {
      await supabaseAdmin.from("profiles").upsert({
        id: created.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        role: "admin",
      });
      await supabaseAdmin.from("admin_profiles").upsert({ user_id: created.user.id }, { onConflict: "user_id" });
    }

    // Sign in to return session tokens
    const { data: sessionData, error: signInErr } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      return res.status(201).json({
        message: "Account created successfully. Please log in.",
        user: created.user,
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", created.user.id)
      .single();

    return res.status(201).json({
      message: "Account created successfully.",
      session: sessionData.session,
      user: sessionData.user,
      profile,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/login", requireSupabase, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const { data, error } = await supabasePublic.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      return res.status(401).json({ error: error?.message || "Invalid email or password." });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(403).json({ error: "User profile not found." });
    }
    if (!profile.is_active) {
      return res.status(403).json({ error: "This account has been deactivated." });
    }

    return res.json({
      session: data.session,
      user: data.user,
      profile,
    });
  } catch (err) {
    return next(err);
  }
});

function isPreviewVercelHost(urlOrHost = "") {
  return (
    /-[a-z0-9]+-[a-z0-9-]+s-projects-[a-z0-9]+\.vercel\.app/i.test(urlOrHost) ||
    /-[a-z0-9]{9,}-[a-z0-9-]+\.vercel\.app/i.test(urlOrHost)
  );
}

function resolveClientOrigin(req) {
  const configuredClientUrl = process.env.CLIENT_URL?.trim().replace(/\/+$/, "");
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
    : null;

  if (process.env.VERCEL) {
    if (
      configuredClientUrl &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredClientUrl) &&
      !isPreviewVercelHost(configuredClientUrl)
    ) {
      return configuredClientUrl;
    }

    const originHeader = req.get("origin")?.trim().replace(/\/+$/, "");
    if (originHeader && !isPreviewVercelHost(originHeader) && !/localhost|127\.0\.0\.1/i.test(originHeader)) {
      return originHeader;
    }

    if (prodUrl) {
      return prodUrl;
    }
  }

  if (configuredClientUrl) {
    return configuredClientUrl;
  }
  const originHeader = req.get("origin");
  if (originHeader) {
    return originHeader.replace(/\/+$/, "");
  }
  const host = req.get("host");
  if (host) {
    return `${req.protocol}://${host}`;
  }
  if (prodUrl) {
    return prodUrl;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:5173";
}

router.post("/forgot-password", requireSupabase, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email is required." });
    }

    const redirectTo = `${resolveClientOrigin(req)}/reset-password`;
    const { error } = await supabasePublic.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/oauth-sync", requireSupabase, async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) {
      return res.status(401).json({ error: "Authorization token required." });
    }

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return res.status(401).json({ error: "Invalid or expired OAuth session." });
    }

    const authUser = userRes.user;
    const email = normalizeEmail(authUser.email);
    if (!email) {
      return res.status(400).json({
        error: "Your OAuth account did not provide an email address. Please ensure your email is verified/public.",
      });
    }

    const meta = authUser.user_metadata || {};
    const rawFullName = sanitizeText(
      meta.full_name || meta.name || meta.user_name || meta.preferred_username || "",
      120
    );
    const nameParts = rawFullName ? rawFullName.split(/\s+/).filter(Boolean) : [];
    const firstName =
      normalizePersonName(sanitizeText(meta.first_name || meta.given_name || nameParts[0] || "", 80)) ||
      email.split("@")[0];
    const lastName = normalizePersonName(
      sanitizeText(meta.last_name || meta.family_name || nameParts.slice(1).join(" ") || "", 80)
    );
    const fullName = `${firstName} ${lastName}`.trim() || email.split("@")[0];
    const avatarUrl = sanitizeText(meta.avatar_url || meta.picture || "", 500) || null;

    const requestedRoleRaw = String(req.body?.requestedRole || "").trim().toLowerCase();
    const safeRequestedRole = requestedRoleRaw === "alumni" ? "alumni" : "student";

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    let finalProfile = existingProfile;

    if (!existingProfile) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: authUser.id,
          email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          role: safeRequestedRole,
          avatar_url: avatarUrl,
        })
        .select("*")
        .single();

      if (insertErr) throw insertErr;
      finalProfile = inserted;

      if (safeRequestedRole === "student") {
        await supabaseAdmin
          .from("student_profiles")
          .upsert({ user_id: authUser.id }, { onConflict: "user_id" });
      } else {
        const { data: linked } = await supabaseAdmin
          .from("alumni_profiles")
          .update({ user_id: authUser.id, full_name: fullName })
          .ilike("email", email)
          .is("user_id", null)
          .select("id");

        if (!linked || linked.length === 0) {
          await supabaseAdmin
            .from("alumni_profiles")
            .upsert(
              {
                user_id: authUser.id,
                email,
                full_name: fullName,
                avatar_url: avatarUrl,
                is_verified: false,
                verification_status: "pending",
              },
              { onConflict: "email" }
            );
        }
      }
    } else {
      if (!existingProfile.is_active) {
        return res.status(403).json({ error: "This account has been deactivated." });
      }

      const updates = {};
      const emailPrefix = email.split("@")[0];
      if ((!existingProfile.full_name || existingProfile.full_name === emailPrefix) && fullName !== emailPrefix) {
        updates.first_name = firstName;
        updates.last_name = lastName;
        updates.full_name = fullName;
      }
      if (!existingProfile.avatar_url && avatarUrl) {
        updates.avatar_url = avatarUrl;
      }

      // If handle_new_user() trigger just provisioned a brand-new OAuth signup as 'student'
      // but the user selected 'alumni' on the signup form, switch the fresh empty profile once.
      const isBrandNew =
        existingProfile.created_at &&
        Date.now() - new Date(existingProfile.created_at).getTime() < 2 * 60 * 1000;

      if (isBrandNew && existingProfile.role === "student" && safeRequestedRole === "alumni") {
        const { data: sp } = await supabaseAdmin
          .from("student_profiles")
          .select("id, roll_number, degree, department, graduation_year")
          .eq("user_id", authUser.id)
          .maybeSingle();

        const isEmptyStudent =
          !sp || (!sp.roll_number && !sp.degree && !sp.department && !sp.graduation_year);

        if (isEmptyStudent) {
          updates.role = "alumni";
          if (sp?.id) {
            await supabaseAdmin.from("student_profiles").delete().eq("id", sp.id);
          }
          const { data: linked } = await supabaseAdmin
            .from("alumni_profiles")
            .update({ user_id: authUser.id, full_name: fullName })
            .ilike("email", email)
            .is("user_id", null)
            .select("id");

          if (!linked || linked.length === 0) {
            await supabaseAdmin
              .from("alumni_profiles")
              .upsert(
                {
                  user_id: authUser.id,
                  email,
                  full_name: fullName,
                  avatar_url: avatarUrl,
                  is_verified: false,
                  verification_status: "pending",
                },
                { onConflict: "email" }
              );
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update(updates)
          .eq("id", authUser.id)
          .select("*")
          .single();
        if (updateErr) throw updateErr;
        finalProfile = updated;
      }
    }

    let roleProfile = null;
    if (finalProfile.role === "student") {
      const { data } = await supabaseAdmin
        .from("student_profiles")
        .select("*")
        .eq("user_id", finalProfile.id)
        .maybeSingle();
      roleProfile = data;
    } else if (finalProfile.role === "alumni") {
      const { data } = await supabaseAdmin
        .from("alumni_profiles")
        .select("*")
        .eq("user_id", finalProfile.id)
        .maybeSingle();
      roleProfile = data;
    } else if (finalProfile.role === "admin") {
      const { data } = await supabaseAdmin
        .from("admin_profiles")
        .select("*")
        .eq("user_id", finalProfile.id)
        .maybeSingle();
      roleProfile = data;
    }

    return res.json({ profile: finalProfile, roleProfile });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { profile } = req;
    let roleProfile = null;

    if (profile.role === "student") {
      const { data } = await supabaseAdmin
        .from("student_profiles")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      roleProfile = data;
    } else if (profile.role === "alumni") {
      const { data } = await supabaseAdmin
        .from("alumni_profiles")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      roleProfile = data;
    } else if (profile.role === "admin") {
      const { data } = await supabaseAdmin
        .from("admin_profiles")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      roleProfile = data;
    }

    return res.json({ profile, roleProfile });
  } catch (err) {
    return next(err);
  }
});

router.post("/provision-admin", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const firstName = normalizePersonName(sanitizeText(req.body.firstName, 80));
    const lastName = normalizePersonName(sanitizeText(req.body.lastName, 80));

    if (!isValidEmail(email) || password.length < 8 || !firstName) {
      return res.status(400).json({ error: "Valid email, firstName, and password (min 8 chars) required." });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, full_name: fullName, role: "admin" },
    });

    if (error) return res.status(400).json({ error: error.message });

    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      role: "admin",
    });
    await supabaseAdmin.from("admin_profiles").upsert({ user_id: created.user.id }, { onConflict: "user_id" });

    return res.status(201).json({ message: "Admin user provisioned.", userId: created.user.id });
  } catch (err) {
    return next(err);
  }
});

export default router;
