import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { normalizeCompany, normalizeSkillsList, sanitizeText } from "../utils/normalize.js";
import { isValidUrl, isValidUuid } from "../utils/validation.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const search = sanitizeText(req.query.search, 120).toLowerCase();
    const jobType = sanitizeText(req.query.job_type, 40);
    const workMode = sanitizeText(req.query.work_mode, 40);

    let query = supabaseAdmin
      .from("job_opportunities")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (jobType && jobType !== "all") query = query.eq("job_type", jobType);
    if (workMode && workMode !== "all") query = query.eq("work_mode", workMode);

    const { data: jobs, error } = await query;
    if (error) throw error;

    const posterIds = [...new Set((jobs || []).map((j) => j.posted_by))];
    const { data: posters } =
      posterIds.length > 0
        ? await supabaseAdmin.from("profiles").select("id, full_name, role, avatar_url").in("id", posterIds)
        : { data: [] };

    const posterMap = new Map((posters || []).map((p) => [p.id, p]));

    const enriched = (jobs || [])
      .map((j) => ({ ...j, poster: posterMap.get(j.posted_by) || null }))
      .filter((j) => {
        if (!search) return true;
        const text = [j.title, j.company, j.location, j.industry, ...(j.required_skills || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(search);
      });

    return res.json({ jobs: enriched });
  } catch (err) {
    return next(err);
  }
});

router.post("/", requireRole("alumni", "admin"), async (req, res, next) => {
  try {
    const title = sanitizeText(req.body.title, 180);
    const company = normalizeCompany(req.body.company);
    const description = sanitizeText(req.body.description, 4000);
    const applicationUrl = sanitizeText(req.body.application_url, 300) || null;

    if (!title || !company || !description) {
      return res.status(400).json({ error: "Title, company, and description are required." });
    }
    if (applicationUrl && !isValidUrl(applicationUrl)) {
      return res.status(400).json({ error: "Invalid application URL." });
    }

    const { data: created, error } = await supabaseAdmin
      .from("job_opportunities")
      .insert({
        posted_by: req.profile.id,
        title,
        company,
        location: sanitizeText(req.body.location, 120) || null,
        job_type: sanitizeText(req.body.job_type || "full_time", 40),
        work_mode: sanitizeText(req.body.work_mode || "hybrid", 40),
        industry: sanitizeText(req.body.industry, 100) || null,
        description,
        required_skills: normalizeSkillsList(req.body.required_skills || []),
        experience_level: sanitizeText(req.body.experience_level, 80) || null,
        salary_range: sanitizeText(req.body.salary_range, 100) || null,
        application_url: applicationUrl,
        deadline: req.body.deadline || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ job: created });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", requireRole("alumni", "admin"), async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid job ID." });
    }
    const { data: job } = await supabaseAdmin
      .from("job_opportunities")
      .select("id, posted_by")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!job) return res.status(404).json({ error: "Job posting not found." });
    if (job.posted_by !== req.profile.id && req.profile.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this job." });
    }

    await supabaseAdmin.from("job_opportunities").delete().eq("id", job.id);
    return res.json({ message: "Job removed." });
  } catch (err) {
    return next(err);
  }
});

export default router;
