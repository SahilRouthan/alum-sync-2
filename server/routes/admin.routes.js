import express from "express";
import multer from "multer";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { commitAlumniImport, parseAndValidateAlumniCsv } from "../services/csvImportService.js";
import { createNotification } from "../services/notificationService.js";
import { getSkillsMap, syncUserSkills } from "../services/skillSyncService.js";
import {
  normalizeCompany,
  normalizeEmail,
  normalizePersonName,
  sanitizeText,
} from "../utils/normalize.js";
import { isValidEmail, isValidUuid, parseGraduationYear, parsePositiveNumber } from "../utils/validation.js";

const router = express.Router();
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(requireAuth, requireRole("admin"));

// Dashboard Overview & Statistics
router.get("/overview", async (req, res, next) => {
  try {
    const [
      { count: totalStudents },
      { data: alumniRows },
      { data: mentorshipRequests },
      { count: activeConnections },
      { count: totalPosts },
      { count: totalEvents },
      { count: totalJobs },
      { data: recentImports },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabaseAdmin.from("alumni_profiles").select("id, is_verified, verification_status, industry, graduation_year, company"),
      supabaseAdmin.from("mentorship_requests").select("id, status, created_at"),
      supabaseAdmin.from("mentorship_connections").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("community_posts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("events").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("job_opportunities").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("alumni_import_history").select("*").order("created_at", { ascending: false }).limit(5),
    ]);

    const verifiedAlumni = (alumniRows || []).filter((a) => a.is_verified).length;
    const unverifiedAlumni = (alumniRows || []).filter((a) => !a.is_verified).length;

    const industryCounts = new Map();
    const gradYearCounts = new Map();
    const companyCounts = new Map();

    for (const a of alumniRows || []) {
      if (a.industry) industryCounts.set(a.industry, (industryCounts.get(a.industry) || 0) + 1);
      if (a.graduation_year) gradYearCounts.set(String(a.graduation_year), (gradYearCounts.get(String(a.graduation_year)) || 0) + 1);
      if (a.company) companyCounts.set(a.company, (companyCounts.get(a.company) || 0) + 1);
    }

    return res.json({
      stats: {
        totalStudents: totalStudents || 0,
        totalAlumni: (alumniRows || []).length,
        verifiedAlumni,
        unverifiedAlumni,
        totalMentorshipRequests: (mentorshipRequests || []).length,
        pendingMentorshipRequests: (mentorshipRequests || []).filter((r) => r.status === "pending").length,
        activeConnections: activeConnections || 0,
        totalPosts: totalPosts || 0,
        totalEvents: totalEvents || 0,
        totalJobs: totalJobs || 0,
      },
      analytics: {
        byIndustry: [...industryCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
        byGraduationYear: [...gradYearCounts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year)),
        topCompanies: [...companyCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
      },
      recentImports: recentImports || [],
    });
  } catch (err) {
    return next(err);
  }
});

// Alumni Management
router.get("/alumni", async (req, res, next) => {
  try {
    const search = sanitizeText(req.query.search, 120).toLowerCase();
    const status = sanitizeText(req.query.status, 30);

    let query = supabaseAdmin.from("alumni_profiles").select("*").order("created_at", { ascending: false });
    if (status && status !== "all") {
      query = query.eq("verification_status", status);
    }

    const { data: alumni, error } = await query;
    if (error) throw error;

    const { byAlumni } = await getSkillsMap({ alumniProfileIds: (alumni || []).map((a) => a.id) });

    const enriched = (alumni || [])
      .map((a) => ({ ...a, skills: (byAlumni.get(a.id) || []).map((s) => s.name) }))
      .filter((a) => {
        if (!search) return true;
        return [a.full_name, a.email, a.company, a.job_title, a.industry, a.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      });

    return res.json({ alumni: enriched });
  } catch (err) {
    return next(err);
  }
});

router.post("/alumni", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const fullName = normalizePersonName(sanitizeText(req.body.full_name, 160));
    const gradYear = parseGraduationYear(req.body.graduation_year);

    if (!isValidEmail(email) || !fullName) {
      return res.status(400).json({ error: "Valid email and full_name are required." });
    }
    if (Number.isNaN(gradYear)) {
      return res.status(400).json({ error: "Invalid graduation year." });
    }

    const { data: created, error } = await supabaseAdmin
      .from("alumni_profiles")
      .insert({
        email,
        full_name: fullName,
        graduation_year: gradYear,
        degree: sanitizeText(req.body.degree, 100) || null,
        department: sanitizeText(req.body.department, 100) || null,
        company: normalizeCompany(req.body.company) || null,
        job_title: sanitizeText(req.body.job_title, 120) || null,
        industry: sanitizeText(req.body.industry, 100) || null,
        location: sanitizeText(req.body.location, 120) || null,
        years_of_experience: parsePositiveNumber(req.body.years_of_experience, 0),
        is_verified: Boolean(req.body.is_verified ?? true),
        verification_status: req.body.is_verified === false ? "pending" : "verified",
        verified_by: req.body.is_verified === false ? null : req.profile.id,
        verified_at: req.body.is_verified === false ? null : new Date().toISOString(),
        import_source: "admin_created",
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    if (req.body.skills) {
      await syncUserSkills({ alumniProfileId: created.id, skills: req.body.skills, source: "manual" });
    }

    return res.status(201).json({ alumnus: created });
  } catch (err) {
    return next(err);
  }
});

router.patch("/alumni/:id", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: "Invalid ID." });
    const gradYear = parseGraduationYear(req.body.graduation_year);
    if (Number.isNaN(gradYear)) return res.status(400).json({ error: "Invalid graduation year." });

    const updatePayload = {};
    if (req.body.full_name !== undefined) updatePayload.full_name = normalizePersonName(sanitizeText(req.body.full_name, 160));
    if (req.body.company !== undefined) updatePayload.company = normalizeCompany(req.body.company) || null;
    if (req.body.job_title !== undefined) updatePayload.job_title = sanitizeText(req.body.job_title, 120) || null;
    if (req.body.industry !== undefined) updatePayload.industry = sanitizeText(req.body.industry, 100) || null;
    if (req.body.degree !== undefined) updatePayload.degree = sanitizeText(req.body.degree, 100) || null;
    if (req.body.department !== undefined) updatePayload.department = sanitizeText(req.body.department, 100) || null;
    if (req.body.location !== undefined) updatePayload.location = sanitizeText(req.body.location, 120) || null;
    if (req.body.graduation_year !== undefined) updatePayload.graduation_year = gradYear;

    const { data: updated, error } = await supabaseAdmin
      .from("alumni_profiles")
      .update(updatePayload)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (req.body.skills !== undefined) {
      await syncUserSkills({ alumniProfileId: updated.id, skills: req.body.skills, source: "manual", replace: true });
    }

    return res.json({ alumnus: updated });
  } catch (err) {
    return next(err);
  }
});

router.patch("/alumni/:id/verify", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: "Invalid ID." });
    const status = String(req.body.status || "verified").toLowerCase();
    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid verification status." });
    }

    const { data: updated, error } = await supabaseAdmin
      .from("alumni_profiles")
      .update({
        is_verified: status === "verified",
        verification_status: status,
        verified_by: status === "verified" ? req.profile.id : null,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (updated.user_id) {
      await createNotification({
        userId: updated.user_id,
        type: "profile_verification",
        title: status === "verified" ? "Alumni Profile Verified!" : "Profile Verification Update",
        message:
          status === "verified"
            ? "Your alumni profile has been approved by the administrator and is now visible to students."
            : `Your alumni verification status was updated to: ${status}.`,
        link: "/alumni/profile",
      });
    }

    return res.json({ alumnus: updated });
  } catch (err) {
    return next(err);
  }
});

router.delete("/alumni/:id", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: "Invalid ID." });
    await supabaseAdmin.from("alumni_profiles").delete().eq("id", req.params.id);
    return res.json({ message: "Alumni record deleted." });
  } catch (err) {
    return next(err);
  }
});

// Duplicate record detection across alumni_profiles (same normalized name + grad year or similar email)
router.get("/alumni/duplicates", async (req, res, next) => {
  try {
    const { data: alumni, error } = await supabaseAdmin
      .from("alumni_profiles")
      .select("id, email, full_name, graduation_year, company, is_verified, created_at");
    if (error) throw error;

    const groups = new Map();
    for (const a of alumni || []) {
      const key = `${(a.full_name || "").toLowerCase().trim()}::${a.graduation_year || "na"}`;
      const list = groups.get(key) || [];
      list.push(a);
      groups.set(key, list);
    }

    const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
    return res.json({ duplicateGroups });
  } catch (err) {
    return next(err);
  }
});

// Students & User Role Management
router.get("/students", async (req, res, next) => {
  try {
    const search = sanitizeText(req.query.search, 120).toLowerCase();
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*, student_profiles(*)")
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const filtered = (profiles || []).filter((p) => {
      if (!search) return true;
      const sp = Array.isArray(p.student_profiles) ? p.student_profiles[0] : p.student_profiles;
      return [p.full_name, p.email, sp?.department, sp?.degree, sp?.roll_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

    return res.json({ students: filtered });
  } catch (err) {
    return next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ users: data || [] });
  } catch (err) {
    return next(err);
  }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: "Invalid user ID." });
    const newRole = String(req.body.role || "").toLowerCase();
    const isActive = req.body.is_active;

    if (req.params.id === req.profile.id && (newRole !== req.profile.role || isActive === false)) {
      return res.status(400).json({ error: "You cannot demote or deactivate your own admin account." });
    }

    const updates = {};
    if (newRole) {
      if (!["student", "alumni", "admin"].includes(newRole)) {
        return res.status(400).json({ error: "Invalid role." });
      }
      updates.role = newRole;
    }
    if (typeof isActive === "boolean") {
      updates.is_active = isActive;
    }

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (newRole === "admin") {
      await supabaseAdmin.from("admin_profiles").upsert({ user_id: updated.id }, { onConflict: "user_id" });
    } else if (newRole === "alumni") {
      await supabaseAdmin.from("alumni_profiles").upsert(
        { user_id: updated.id, email: updated.email, full_name: updated.full_name },
        { onConflict: "email" }
      );
    } else if (newRole === "student") {
      await supabaseAdmin.from("student_profiles").upsert({ user_id: updated.id }, { onConflict: "user_id" });
    }

    return res.json({ user: updated });
  } catch (err) {
    return next(err);
  }
});

// Community Post Moderation
router.get("/posts", async (req, res, next) => {
  try {
    const { data: posts, error } = await supabaseAdmin
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const authorIds = [...new Set((posts || []).map((p) => p.author_id))];
    const { data: authors } =
      authorIds.length > 0
        ? await supabaseAdmin.from("profiles").select("id, full_name, role, email").in("id", authorIds)
        : { data: [] };

    const authorMap = new Map((authors || []).map((a) => [a.id, a]));
    return res.json({
      posts: (posts || []).map((p) => ({ ...p, author: authorMap.get(p.author_id) || null })),
    });
  } catch (err) {
    return next(err);
  }
});

router.patch("/posts/:id", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: "Invalid post ID." });
    const updates = {};
    if (typeof req.body.is_approved === "boolean") updates.is_approved = req.body.is_approved;
    if (typeof req.body.is_pinned === "boolean") updates.is_pinned = req.body.is_pinned;

    const { data, error } = await supabaseAdmin
      .from("community_posts")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ post: data });
  } catch (err) {
    return next(err);
  }
});

// CSV Bulk Import Pipeline
router.post("/import/preview", uploadCsv.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required." });
    }
    const isCsv =
      req.file.mimetype === "text/csv" ||
      req.file.mimetype === "application/vnd.ms-excel" ||
      req.file.originalname.toLowerCase().endsWith(".csv");

    if (!isCsv) {
      return res.status(400).json({ error: "Only .csv files are supported." });
    }

    const preview = await parseAndValidateAlumniCsv(req.file.buffer);
    return res.json({
      fileName: req.file.originalname,
      ...preview,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post("/import/commit", async (req, res, next) => {
  try {
    const { fileName, validRows = [], duplicateRows = [], errorRows = [], totalRows = 0 } = req.body;
    if (!Array.isArray(validRows)) {
      return res.status(400).json({ error: "validRows must be an array." });
    }

    const result = await commitAlumniImport({
      adminId: req.profile.id,
      fileName: fileName || "alumni-import.csv",
      validRows,
      duplicateRows,
      errorRows,
      totalRows: totalRows || validRows.length + duplicateRows.length + errorRows.length,
    });

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

router.get("/import/history", async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("alumni_import_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ history: data || [] });
  } catch (err) {
    return next(err);
  }
});

export default router;
