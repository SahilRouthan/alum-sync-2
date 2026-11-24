import express from "express";
import multer from "multer";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getSkillsMap, syncUserSkills } from "../services/skillSyncService.js";
import {
  normalizeCompany,
  normalizePersonName,
  normalizeSkillsList,
  sanitizeText,
} from "../utils/normalize.js";
import { isValidUrl, isValidUuid, parseGraduationYear, parsePositiveNumber } from "../utils/validation.js";

const router = express.Router();
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(requireAuth);

// Alumni self-dashboard & profile management (must come BEFORE /:id)
router.get("/me/dashboard", requireRole("alumni"), async (req, res, next) => {
  try {
    const userId = req.profile.id;
    const { data: alumniProfile } = await supabaseAdmin
      .from("alumni_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const [
      { data: requests },
      { data: connections },
      { count: jobsCount },
      { count: postsCount },
      { count: eventsRegistered },
    ] = await Promise.all([
      supabaseAdmin
        .from("mentorship_requests")
        .select("*")
        .or(`alumni_user_id.eq.${userId}${alumniProfile ? `,alumni_id.eq.${alumniProfile.id}` : ""}`)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("mentorship_connections")
        .select("*")
        .or(`alumni_user_id.eq.${userId}${alumniProfile ? `,alumni_id.eq.${alumniProfile.id}` : ""}`),
      supabaseAdmin.from("job_opportunities").select("*", { count: "exact", head: true }).eq("posted_by", userId),
      supabaseAdmin.from("community_posts").select("*", { count: "exact", head: true }).eq("author_id", userId),
      supabaseAdmin.from("event_registrations").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const { byAlumni, byProfile } = await getSkillsMap({
      profileIds: [userId],
      alumniProfileIds: alumniProfile ? [alumniProfile.id] : [],
    });

    const skills = alumniProfile
      ? byAlumni.get(alumniProfile.id) || byProfile.get(userId) || []
      : byProfile.get(userId) || [];

    return res.json({
      profile: req.profile,
      alumniProfile,
      skills,
      stats: {
        pendingRequests: (requests || []).filter((r) => r.status === "pending").length,
        totalRequests: (requests || []).length,
        activeMentees: (connections || []).filter((c) => c.status === "active").length,
        jobsPosted: jobsCount || 0,
        communityPosts: postsCount || 0,
        eventsRegistered: eventsRegistered || 0,
      },
      recentRequests: (requests || []).slice(0, 5),
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/me/profile", requireRole("alumni"), async (req, res, next) => {
  try {
    const userId = req.profile.id;
    const { data: alumniProfile } = await supabaseAdmin
      .from("alumni_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { byAlumni, byProfile } = await getSkillsMap({
      profileIds: [userId],
      alumniProfileIds: alumniProfile ? [alumniProfile.id] : [],
    });

    const skills = (alumniProfile ? byAlumni.get(alumniProfile.id) : null) || byProfile.get(userId) || [];

    return res.json({
      profile: req.profile,
      alumniProfile: alumniProfile || {},
      skills: skills.map((s) => s.name),
    });
  } catch (err) {
    return next(err);
  }
});

router.put("/me/profile", requireRole("alumni"), async (req, res, next) => {
  try {
    const userId = req.profile.id;
    const firstName = normalizePersonName(sanitizeText(req.body.first_name ?? req.profile.first_name, 80));
    const lastName = normalizePersonName(sanitizeText(req.body.last_name ?? req.profile.last_name, 80));
    const fullName = sanitizeText(req.body.full_name, 160) || `${firstName} ${lastName}`.trim() || req.profile.full_name;
    const phone = sanitizeText(req.body.phone, 30) || null;
    const bio = sanitizeText(req.body.bio, 1200) || null;
    const location = sanitizeText(req.body.location, 120) || null;

    const gradYear = parseGraduationYear(req.body.graduation_year);
    if (Number.isNaN(gradYear)) {
      return res.status(400).json({ error: "Invalid graduation year." });
    }
    if (req.body.linkedin_url && !isValidUrl(req.body.linkedin_url)) {
      return res.status(400).json({ error: "Invalid LinkedIn URL." });
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

    const { data: existingAlumni } = await supabaseAdmin
      .from("alumni_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const alumniPayload = {
      user_id: userId,
      email: req.profile.email,
      full_name: fullName,
      graduation_year: gradYear,
      degree: sanitizeText(req.body.degree, 100) || null,
      department: sanitizeText(req.body.department, 100) || null,
      company: normalizeCompany(req.body.company) || null,
      job_title: sanitizeText(req.body.job_title, 120) || null,
      industry: sanitizeText(req.body.industry, 100) || null,
      location,
      bio,
      linkedin_url: sanitizeText(req.body.linkedin_url, 250) || null,
      years_of_experience: parsePositiveNumber(req.body.years_of_experience, 0),
      experience: Array.isArray(req.body.experience) ? req.body.experience : existingAlumni?.experience || [],
      education: Array.isArray(req.body.education) ? req.body.education : existingAlumni?.education || [],
      is_available_for_mentorship:
        req.body.is_available_for_mentorship !== undefined
          ? Boolean(req.body.is_available_for_mentorship)
          : existingAlumni?.is_available_for_mentorship ?? true,
      mentorship_topics:
        req.body.mentorship_topics !== undefined
          ? normalizeSkillsList(req.body.mentorship_topics)
          : existingAlumni?.mentorship_topics || [],
      max_mentees: req.body.max_mentees ? Math.max(1, Math.min(25, Number(req.body.max_mentees))) : existingAlumni?.max_mentees || 5,
    };

    let savedAlumni;
    if (existingAlumni) {
      const { data, error } = await supabaseAdmin
        .from("alumni_profiles")
        .update(alumniPayload)
        .eq("id", existingAlumni.id)
        .select()
        .single();
      if (error) throw error;
      savedAlumni = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("alumni_profiles")
        .insert({ ...alumniPayload, is_verified: false, verification_status: "pending" })
        .select()
        .single();
      if (error) throw error;
      savedAlumni = data;
    }

    let syncedSkills = [];
    if (req.body.skills !== undefined) {
      syncedSkills = await syncUserSkills({
        alumniProfileId: savedAlumni.id,
        skills: req.body.skills,
        source: "manual",
        replace: true,
      });
    }

    return res.json({
      profile: updatedProfile,
      alumniProfile: savedAlumni,
      skills: syncedSkills.map((s) => s.name),
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/me/avatar", requireRole("alumni", "student", "admin"), uploadAvatar.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required." });
    }
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Only PNG, JPEG, or WebP images are allowed." });
    }

    const ext = req.file.mimetype.split("/")[1];
    const filePath = `${req.profile.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = supabaseAdmin.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = publicUrlData.publicUrl;

    await supabaseAdmin.from("profiles").update({ avatar_url: avatarUrl }).eq("id", req.profile.id);
    if (req.profile.role === "alumni") {
      await supabaseAdmin.from("alumni_profiles").update({ avatar_url: avatarUrl }).eq("user_id", req.profile.id);
    }

    return res.json({ avatarUrl });
  } catch (err) {
    return next(err);
  }
});

// Directory: Discover verified alumni (supports multi-field search & filters)
router.get("/", async (req, res, next) => {
  try {
    const search = sanitizeText(req.query.search, 120).toLowerCase();
    const company = sanitizeText(req.query.company, 100).toLowerCase();
    const industry = sanitizeText(req.query.industry, 100).toLowerCase();
    const jobRole = sanitizeText(req.query.job_role || req.query.job_title, 100).toLowerCase();
    const skill = sanitizeText(req.query.skill, 80).toLowerCase();
    const location = sanitizeText(req.query.location, 100).toLowerCase();
    const graduationYear = req.query.graduation_year ? Number(req.query.graduation_year) : null;
    const onlyMentors = req.query.available === "true";

    let query = supabaseAdmin.from("alumni_profiles").select("*").order("updated_at", { ascending: false });

    if (req.profile.role !== "admin") {
      query = query.eq("is_verified", true);
    }
    if (graduationYear && Number.isInteger(graduationYear)) {
      query = query.eq("graduation_year", graduationYear);
    }
    if (onlyMentors) {
      query = query.eq("is_available_for_mentorship", true);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const alumniIds = (rows || []).map((r) => r.id);
    const { byAlumni } = await getSkillsMap({ alumniProfileIds: alumniIds });

    const enriched = (rows || [])
      .map((row) => ({
        ...row,
        skills: (byAlumni.get(row.id) || []).map((s) => s.name),
      }))
      .filter((row) => {
        if (company && !(row.company || "").toLowerCase().includes(company)) return false;
        if (industry && !(row.industry || "").toLowerCase().includes(industry)) return false;
        if (jobRole && !(row.job_title || "").toLowerCase().includes(jobRole)) return false;
        if (location && !(row.location || "").toLowerCase().includes(location)) return false;
        if (skill && !row.skills.some((s) => s.toLowerCase().includes(skill))) return false;
        if (search) {
          const haystack = [
            row.full_name,
            row.company,
            row.job_title,
            row.industry,
            row.location,
            row.department,
            ...row.skills,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });

    return res.json({ alumni: enriched });
  } catch (err) {
    return next(err);
  }
});

// Single Alumni Detail
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: "Invalid alumni ID format." });
    }

    const { data: alumnus, error } = await supabaseAdmin
      .from("alumni_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!alumnus) return res.status(404).json({ error: "Alumni profile not found." });

    if (!alumnus.is_verified && req.profile.role !== "admin" && alumnus.user_id !== req.profile.id) {
      return res.status(403).json({ error: "This alumni profile is pending verification." });
    }

    const { byAlumni } = await getSkillsMap({ alumniProfileIds: [alumnus.id] });
    return res.json({
      alumnus: {
        ...alumnus,
        skills: (byAlumni.get(alumnus.id) || []).map((s) => s.name),
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
