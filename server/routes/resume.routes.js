import express from "express";
import multer from "multer";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getAlumniRecommendationsForStudent } from "../services/matchingEngineService.js";
import { analyzeResumeText, extractTextFromPdf, validatePdfBuffer } from "../services/resumeParserService.js";
import { syncUserSkills } from "../services/skillSyncService.js";
import { sanitizeText } from "../utils/normalize.js";
import { isValidUuid } from "../utils/validation.js";

const router = express.Router();
const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(requireAuth, requireRole("student", "admin"));

async function getAlumniSkillFrequency() {
  const { data } = await supabaseAdmin
    .from("user_skills")
    .select("alumni_profile_id, skills(name)")
    .not("alumni_profile_id", "is", null);

  const counts = new Map();
  for (const row of data || []) {
    const name = row.skills?.name;
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

router.post("/upload", requireRole("student"), uploadResume.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a PDF resume file." });
    }

    try {
      validatePdfBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
    } catch (valErr) {
      return res.status(400).json({ error: valErr.message });
    }

    const studentId = req.profile.id;
    const targetRole = sanitizeText(req.body.targetRole, 120);
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${studentId}/${Date.now()}-${safeName}`;

    // Upload securely to private 'resumes' Supabase Storage bucket
    const { error: storageErr } = await supabaseAdmin.storage
      .from("resumes")
      .upload(filePath, req.file.buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageErr) throw storageErr;

    const { data: signedData } = await supabaseAdmin.storage
      .from("resumes")
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    // Extract text from PDF (with OCR fallback if scanned)
    let extracted;
    try {
      extracted = await extractTextFromPdf(req.file.buffer);
    } catch (parseErr) {
      try {
        await supabaseAdmin.from("resumes").insert({
          student_id: studentId,
          file_name: req.file.originalname,
          file_path: filePath,
          file_url: signedData?.signedUrl || null,
          file_size: req.file.size,
          mime_type: "application/pdf",
          parse_status: "failed",
        });
      } catch {
        // ignore failed audit row insert
      }
      return res.status(422).json({ error: parseErr.message });
    }

    const { data: resumeRecord, error: resumeErr } = await supabaseAdmin
      .from("resumes")
      .insert({
        student_id: studentId,
        file_name: req.file.originalname,
        file_path: filePath,
        file_url: signedData?.signedUrl || null,
        file_size: req.file.size,
        mime_type: "application/pdf",
        raw_text: extracted.text,
        extraction_method: extracted.method,
        parse_status: "completed",
      })
      .select()
      .single();

    if (resumeErr) throw resumeErr;

    const alumniSkillFrequency = await getAlumniSkillFrequency();
    const analysis = analyzeResumeText({
      rawText: extracted.text,
      targetRoleInput: targetRole,
      alumniSkillFrequency,
    });

    const { data: savedAnalysis, error: analysisErr } = await supabaseAdmin
      .from("resume_analysis")
      .upsert(
        {
          resume_id: resumeRecord.id,
          student_id: studentId,
          technical_skills: analysis.technicalSkills,
          soft_skills: analysis.softSkills,
          education: analysis.education,
          work_experience: analysis.workExperience,
          projects: analysis.projects,
          certifications: analysis.certifications,
          target_role: analysis.targetRole,
          skill_gaps: analysis.skillGaps,
          recommended_skills: analysis.recommendedSkills,
          career_recommendations: analysis.careerRecommendations,
          improvement_suggestions: analysis.improvementSuggestions,
          completeness_score: analysis.completenessScore,
          summary: analysis.summary,
        },
        { onConflict: "resume_id" }
      )
      .select()
      .single();

    if (analysisErr) throw analysisErr;

    // Sync extracted skills into user_skills (non-destructive merge)
    const combinedSkills = [...analysis.technicalSkills, ...analysis.softSkills];
    if (combinedSkills.length > 0) {
      await syncUserSkills({
        profileId: studentId,
        skills: combinedSkills,
        source: "resume",
        replace: false,
      });
    }

    const matchingAlumni = await getAlumniRecommendationsForStudent(studentId, 6);

    return res.status(201).json({
      resume: resumeRecord,
      analysis: savedAnalysis,
      matchingAlumni,
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("resumes")
      .select("*, resume_analysis(*)")
      .eq("student_id", req.profile.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ resumes: data || [] });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid resume ID." });
    }
    const { data, error } = await supabaseAdmin
      .from("resumes")
      .select("*, resume_analysis(*)")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Resume not found." });
    if (data.student_id !== req.profile.id && req.profile.role !== "admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const matchingAlumni = await getAlumniRecommendationsForStudent(data.student_id, 6);
    return res.json({ resume: data, matchingAlumni });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/analyze", requireRole("student"), async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid resume ID." });
    }

    const { data: resumeRecord, error } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("id", req.params.id)
      .eq("student_id", req.profile.id)
      .maybeSingle();

    if (error) throw error;
    if (!resumeRecord || !resumeRecord.raw_text) {
      return res.status(404).json({ error: "Resume text not found for analysis." });
    }

    const alumniSkillFrequency = await getAlumniSkillFrequency();
    const analysis = analyzeResumeText({
      rawText: resumeRecord.raw_text,
      targetRoleInput: sanitizeText(req.body.targetRole, 120),
      alumniSkillFrequency,
    });

    const { data: savedAnalysis, error: analysisErr } = await supabaseAdmin
      .from("resume_analysis")
      .upsert(
        {
          resume_id: resumeRecord.id,
          student_id: req.profile.id,
          technical_skills: analysis.technicalSkills,
          soft_skills: analysis.softSkills,
          education: analysis.education,
          work_experience: analysis.workExperience,
          projects: analysis.projects,
          certifications: analysis.certifications,
          target_role: analysis.targetRole,
          skill_gaps: analysis.skillGaps,
          recommended_skills: analysis.recommendedSkills,
          career_recommendations: analysis.careerRecommendations,
          improvement_suggestions: analysis.improvementSuggestions,
          completeness_score: analysis.completenessScore,
          summary: analysis.summary,
        },
        { onConflict: "resume_id" }
      )
      .select()
      .single();

    if (analysisErr) throw analysisErr;

    const matchingAlumni = await getAlumniRecommendationsForStudent(req.profile.id, 6);
    return res.json({ analysis: savedAnalysis, matchingAlumni });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", requireRole("student"), async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid resume ID." });
    }
    const { data: existing } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("id", req.params.id)
      .eq("student_id", req.profile.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: "Resume not found." });

    await supabaseAdmin.storage.from("resumes").remove([existing.file_path]);
    await supabaseAdmin.from("resumes").delete().eq("id", existing.id);

    return res.json({ message: "Resume deleted." });
  } catch (err) {
    return next(err);
  }
});

export default router;
