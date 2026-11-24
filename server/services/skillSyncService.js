import { supabaseAdmin } from "../config/supabase.js";
import { normalizeSkillsList } from "../utils/normalize.js";

const SOFT_SKILL_SET = new Set([
  "communication",
  "leadership",
  "problem solving",
  "teamwork",
  "public speaking",
  "project management",
  "critical thinking",
  "time management",
  "adaptability",
  "mentoring",
  "collaboration",
  "negotiation",
  "presentation",
  "analytical thinking",
]);

function inferCategory(skillName) {
  const lower = skillName.toLowerCase();
  if (SOFT_SKILL_SET.has(lower)) return "soft";
  if (["docker", "kubernetes", "aws", "google cloud", "azure", "git", "figma", "jira", "postman", "linux"].includes(lower)) {
    return "tool";
  }
  if (["system design", "product management", "agile", "scrum", "ui/ux design", "devops"].includes(lower)) {
    return "domain";
  }
  return "technical";
}

export async function ensureSkillsExist(skillNames) {
  const normalizedList = normalizeSkillsList(skillNames);
  if (normalizedList.length === 0) return [];

  const rows = normalizedList.map((name) => ({
    name,
    normalized_name: name.toLowerCase(),
    category: inferCategory(name),
  }));

  const { data, error } = await supabaseAdmin
    .from("skills")
    .upsert(rows, { onConflict: "normalized_name" })
    .select("id, name, normalized_name, category");

  if (error) {
    throw error;
  }
  return data || [];
}

export async function syncUserSkills({ profileId = null, alumniProfileId = null, skills = [], source = "manual", replace = true }) {
  if (!profileId && !alumniProfileId) return [];

  const skillRecords = await ensureSkillsExist(skills);

  if (replace) {
    let deleteQuery = supabaseAdmin.from("user_skills").delete();
    if (profileId) {
      deleteQuery = deleteQuery.eq("profile_id", profileId);
    } else {
      deleteQuery = deleteQuery.eq("alumni_profile_id", alumniProfileId);
    }
    const { error: delError } = await deleteQuery;
    if (delError) throw delError;
  }

  if (skillRecords.length === 0) return [];

  const insertRows = skillRecords.map((skill) => ({
    profile_id: profileId,
    alumni_profile_id: alumniProfileId,
    skill_id: skill.id,
    proficiency: "intermediate",
    source,
  }));

  const { error: insertError } = await supabaseAdmin.from("user_skills").insert(insertRows);
  if (insertError && insertError.code !== "23505") {
    throw insertError;
  }

  return skillRecords;
}

export async function getSkillsMap({ profileIds = [], alumniProfileIds = [] }) {
  const byProfile = new Map();
  const byAlumni = new Map();

  if (profileIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("user_skills")
      .select("profile_id, proficiency, source, skills(id, name, normalized_name, category)")
      .in("profile_id", profileIds);

    if (!error && data) {
      for (const row of data) {
        if (!row.skills) continue;
        const list = byProfile.get(row.profile_id) || [];
        list.push({
          ...row.skills,
          proficiency: row.proficiency,
          source: row.source,
        });
        byProfile.set(row.profile_id, list);
      }
    }
  }

  if (alumniProfileIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("user_skills")
      .select("alumni_profile_id, proficiency, source, skills(id, name, normalized_name, category)")
      .in("alumni_profile_id", alumniProfileIds);

    if (!error && data) {
      for (const row of data) {
        if (!row.skills) continue;
        const list = byAlumni.get(row.alumni_profile_id) || [];
        list.push({
          ...row.skills,
          proficiency: row.proficiency,
          source: row.source,
        });
        byAlumni.set(row.alumni_profile_id, list);
      }
    }
  }

  return { byProfile, byAlumni };
}
