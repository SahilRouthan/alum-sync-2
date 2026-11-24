import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getAlumniRecommendationsForStudent } from "../services/matchingEngineService.js";
import { getSkillsMap, syncUserSkills } from "../services/skillSyncService.js";
import { normalizePersonName, normalizeSkillsList, sanitizeText } from "../utils/normalize.js";
import { isValidUrl, parseGraduationYear } from "../utils/validation.js";

const router = express.Router();

router.use(requireAuth, requireRole("student"));

router.get("/dashboard", async (req, res, next) => {
  try {
    const userId = req.profile.id;

    const [
      { data: studentProfile },
      { data: requests },
      { data: connections },
      { data: latestResume },
      { data: latestAnalysis },
      { count: unreadNotifications },
      { count: upcomingEventsCount },
      { count: activeJobsCount },
    ] = await Promise.all([
      supabaseAdmin.from("student_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("mentorship_requests").select("*").eq("student_id", userId).order("created_at", { ascending: false }),
      supabaseAdmin.from("mentorship_connections").select("*").eq("student_id", userId).eq("status", "active"),
      supabaseAdmin.from("resumes").select("id, file_name, parse_status, created_at").eq("student_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("resume_analysis").select("*").eq("student_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
      supabaseAdmin.from("events").select("*", { count: "exact", head: true }).eq("status", "upcoming"),
      supabaseAdmin.from("job_opportunities").select("*", { count: "exact", head: true }).eq("is_active", true),
    ]);

    const { byProfile } = await getSkillsMap({ profileIds: [userId] });
    const recommendations = await getAlumniRecommendationsForStudent(userId, 5);

    return res.json({
      profile: req.profile,
      studentProfile,
      skills: byProfile.get(userId) || [],
      stats: {
        pendingRequests: (requests || []).filter((r) => r.status === "pending").length,
        activeConnections: (connections || []).length,
        skillsCount: (byProfile.get(userId) || []).length,
        resumeScore: latestAnalysis?.completeness_score ?? null,
        unreadNotifications: unreadNotifications || 0,
        upcomingEventsCount: upcomingEventsCount || 0,
        activeJobsCount: activeJobsCount || 0,
      },
      latestResume,
      latestAnalysis,
      recommendations,
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/profile", async (req, res, next) => {
  try {
    const userId = req.profile.id;
    const [{ data: studentProfile }, { byProfile }] = await Promise.all([
      supabaseAdmin.from("student_profiles").select("*").eq("user_id", userId).maybeSingle(),
      getSkillsMap({ profileIds: [userId] }),
    ]);

    return res.json({
      profile: req.profile,
      studentProfile: studentProfile || {},
      skills: (byProfile.get(userId) || []).map((s) => s.name),
    });
  } catch (err) {
    return next(err);
  }
});

router.put("/profile", async (req, res, next) => {
  try {
    const userId = req.profile.id;
    const firstName = normalizePersonName(sanitizeText(req.body.first_name ?? req.profile.first_name, 80));
    const lastName = normalizePersonName(sanitizeText(req.body.last_name ?? req.profile.last_name, 80));
    const fullName = `${firstName} ${lastName}`.trim() || req.profile.full_name;
    const phone = sanitizeText(req.body.phone, 30) || null;
    const bio = sanitizeText(req.body.bio, 1000) || null;
    const location = sanitizeText(req.body.location, 120) || null;

    const gradYear = parseGraduationYear(req.body.graduation_year);
    if (Number.isNaN(gradYear)) {
      return res.status(400).json({ error: "Invalid graduation year." });
    }

    for (const urlField of ["linkedin_url", "github_url", "portfolio_url"]) {
      if (req.body[urlField] && !isValidUrl(req.body[urlField])) {
        return res.status(400).json({ error: `Invalid URL format for ${urlField}` });
      }
    }

    const { data: updatedProfile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone,
        bio,
        location,
      })
      .eq("id", userId)
      .select()
      .single();

    if (profErr) throw profErr;

    const studentUpdate = {
      user_id: userId,
      roll_number: sanitizeText(req.body.roll_number, 50) || null,
      degree: sanitizeText(req.body.degree, 100) || null,
      department: sanitizeText(req.body.department, 100) || null,
      graduation_year: gradYear,
      current_year: req.body.current_year ? Number(req.body.current_year) : null,
      cgpa: req.body.cgpa !== undefined && req.body.cgpa !== "" ? Number(req.body.cgpa) : null,
      career_interests: normalizeSkillsList(req.body.career_interests),
      target_roles: normalizeSkillsList(req.body.target_roles),
      target_industries: normalizeSkillsList(req.body.target_industries),
      education: Array.isArray(req.body.education) ? req.body.education : [],
      projects: Array.isArray(req.body.projects) ? req.body.projects : [],
      certifications: Array.isArray(req.body.certifications) ? req.body.certifications : [],
      linkedin_url: sanitizeText(req.body.linkedin_url, 250) || null,
      github_url: sanitizeText(req.body.github_url, 250) || null,
      portfolio_url: sanitizeText(req.body.portfolio_url, 250) || null,
    };

    const { data: updatedStudent, error: studErr } = await supabaseAdmin
      .from("student_profiles")
      .upsert(studentUpdate, { onConflict: "user_id" })
      .select()
      .single();

    if (studErr) throw studErr;

    let syncedSkills = [];
    if (req.body.skills !== undefined) {
      syncedSkills = await syncUserSkills({
        profileId: userId,
        skills: req.body.skills,
        source: "manual",
        replace: true,
      });
    }

    return res.json({
      profile: updatedProfile,
      studentProfile: updatedStudent,
      skills: syncedSkills.map((s) => s.name),
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/recommendations", async (req, res, next) => {
  try {
    const limit = Math.min(30, Math.max(1, Number(req.query.limit || 12)));
    const recommendations = await getAlumniRecommendationsForStudent(req.profile.id, limit);
    return res.json({ recommendations });
  } catch (err) {
    return next(err);
  }
});

export default router;
