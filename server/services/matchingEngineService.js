import { supabaseAdmin } from "../config/supabase.js";
import { getSkillsMap } from "./skillSyncService.js";

function tokenize(text) {
  if (!text) return new Set();
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2)
  );
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export async function getAlumniRecommendationsForStudent(studentUserId, limit = 12) {
  const { data: studentProfile } = await supabaseAdmin
    .from("student_profiles")
    .select("*")
    .eq("user_id", studentUserId)
    .maybeSingle();

  const { data: latestAnalysis } = await supabaseAdmin
    .from("resume_analysis")
    .select("*")
    .eq("student_id", studentUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: alumniRows, error: alumniError } = await supabaseAdmin
    .from("alumni_profiles")
    .select("*")
    .eq("is_verified", true)
    .order("updated_at", { ascending: false });

  if (alumniError) throw alumniError;
  if (!alumniRows || alumniRows.length === 0) return [];

  const alumniIds = alumniRows.map((a) => a.id);
  const alumniUserIds = alumniRows.map((a) => a.user_id).filter(Boolean);

  const { byProfile, byAlumni } = await getSkillsMap({
    profileIds: [studentUserId, ...alumniUserIds],
    alumniProfileIds: alumniIds,
  });

  // Build student skill set from profile skills + latest resume analysis skills
  const studentSkillSet = new Set();
  const profileSkills = byProfile.get(studentUserId) || [];
  for (const s of profileSkills) studentSkillSet.add(s.name.toLowerCase());
  if (latestAnalysis) {
    for (const s of latestAnalysis.technical_skills || []) studentSkillSet.add(String(s).toLowerCase());
    for (const s of latestAnalysis.soft_skills || []) studentSkillSet.add(String(s).toLowerCase());
  }

  const studentIndustries = new Set([
    ...(studentProfile?.target_industries || []).map((i) => i.toLowerCase()),
    ...(studentProfile?.career_interests || []).map((i) => i.toLowerCase()),
  ]);

  const studentRoleTokens = new Set([
    ...tokenize((studentProfile?.target_roles || []).join(" ")),
    ...tokenize((studentProfile?.career_interests || []).join(" ")),
    ...tokenize(latestAnalysis?.target_role || ""),
  ]);

  const studentEduTokens = tokenize(
    `${studentProfile?.degree || ""} ${studentProfile?.department || ""}`
  );

  const recommendations = alumniRows
    .filter((a) => a.user_id !== studentUserId)
    .map((alumnus) => {
      const aSkills = new Map();
      for (const s of byAlumni.get(alumnus.id) || []) {
        aSkills.set(s.name.toLowerCase(), s.name);
      }
      if (alumnus.user_id) {
        for (const s of byProfile.get(alumnus.user_id) || []) {
          aSkills.set(s.name.toLowerCase(), s.name);
        }
      }

      const alumniSkillSet = new Set(aSkills.keys());
      const matchedSkills = [];
      for (const [lower, display] of aSkills.entries()) {
        if (studentSkillSet.has(lower)) matchedSkills.push(display);
      }

      // 1. Skills similarity (40%)
      let skillsRatio = 0;
      if (studentSkillSet.size > 0 && alumniSkillSet.size > 0) {
        const coverage = matchedSkills.length / Math.min(studentSkillSet.size, alumniSkillSet.size);
        const jaccard = jaccardSimilarity(studentSkillSet, alumniSkillSet);
        skillsRatio = 0.65 * coverage + 0.35 * jaccard;
      }
      const skillsScore = Math.round(Math.min(1, skillsRatio) * 40);

      // 2. Industry similarity (25%)
      let industryRatio = 0;
      const alumniIndustry = (alumnus.industry || "").toLowerCase();
      if (alumniIndustry && studentIndustries.size > 0) {
        for (const targetInd of studentIndustries) {
          if (alumniIndustry.includes(targetInd) || targetInd.includes(alumniIndustry)) {
            industryRatio = 1;
            break;
          }
        }
        if (industryRatio === 0) {
          industryRatio = jaccardSimilarity(tokenize(alumniIndustry), tokenize([...studentIndustries].join(" ")));
        }
      }
      const industryScore = Math.round(Math.min(1, industryRatio) * 25);

      // 3. Career role similarity (20%)
      const alumniRoleTokens = tokenize(
        `${alumnus.job_title || ""} ${(alumnus.mentorship_topics || []).join(" ")}`
      );
      const roleRatio =
        studentRoleTokens.size > 0 && alumniRoleTokens.size > 0
          ? Math.min(1, jaccardSimilarity(studentRoleTokens, alumniRoleTokens) * 2.2)
          : 0;
      const roleScore = Math.round(roleRatio * 20);

      // 4. Education similarity (10%)
      const alumniEduTokens = tokenize(`${alumnus.degree || ""} ${alumnus.department || ""}`);
      const eduRatio =
        studentEduTokens.size > 0 && alumniEduTokens.size > 0
          ? Math.min(1, jaccardSimilarity(studentEduTokens, alumniEduTokens) * 1.8)
          : 0;
      const educationScore = Math.round(eduRatio * 10);

      // 5. Experience & mentorship availability relevance (5%)
      const yrs = Number(alumnus.years_of_experience || 0);
      const expComponent = Math.min(3, (yrs / 8) * 3);
      const availComponent = alumnus.is_available_for_mentorship ? 2 : 0;
      const experienceScore = Math.round(expComponent + availComponent);

      const totalScore = Math.min(
        100,
        skillsScore + industryScore + roleScore + educationScore + experienceScore
      );

      // Build transparent human-readable explanation
      const reasons = [];
      if (matchedSkills.length > 0) {
        reasons.push(`Shares ${matchedSkills.length} skill${matchedSkills.length > 1 ? "s" : ""}: ${matchedSkills.slice(0, 4).join(", ")}`);
      }
      if (industryScore >= 15 && alumnus.industry) {
        reasons.push(`Works in your target industry (${alumnus.industry})`);
      }
      if (roleScore >= 10 && alumnus.job_title) {
        reasons.push(`Relevant role as ${alumnus.job_title}${alumnus.company ? ` at ${alumnus.company}` : ""}`);
      }
      if (educationScore >= 5 && (alumnus.department || alumnus.degree)) {
        reasons.push(`Similar academic background (${[alumnus.degree, alumnus.department].filter(Boolean).join(" • ")})`);
      }
      if (alumnus.is_available_for_mentorship) {
        reasons.push("Currently open for mentorship");
      }
      if (reasons.length === 0) {
        reasons.push("Verified alumni member in the institutional network");
      }

      return {
        ...alumnus,
        skills: [...aSkills.values()],
        matchingScore: totalScore,
        scoreBreakdown: {
          skillsScore,
          industryScore,
          roleScore,
          educationScore,
          experienceScore,
        },
        matchedSkills,
        reasons,
      };
    })
    .sort((a, b) => b.matchingScore - a.matchingScore)
    .slice(0, limit);

  return recommendations;
}
