import { parse } from "csv-parse/sync";
import { supabaseAdmin } from "../config/supabase.js";
import {
  normalizeCompany,
  normalizeEmail,
  normalizePersonName,
  normalizeSkillsList,
  sanitizeText,
} from "../utils/normalize.js";
import { isValidEmail, isValidUrl, parseGraduationYear, parsePositiveNumber } from "../utils/validation.js";
import { syncUserSkills } from "./skillSyncService.js";

function pickField(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return "";
}

export async function parseAndValidateAlumniCsv(buffer) {
  const csvText = buffer.toString("utf-8").replace(/^\uFEFF/, "");
  if (!csvText.trim()) {
    throw new Error("Uploaded CSV file is empty.");
  }

  let records;
  try {
    records = parse(csvText, {
      columns: (headers) => headers.map((h) => String(h).trim().toLowerCase().replace(/\s+/g, "_")),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    throw new Error(`Invalid CSV structure: ${err.message}`);
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("CSV contains headers only and no data rows.");
  }

  const firstKeys = Object.keys(records[0]);
  const hasEmailHeader = firstKeys.some((k) => ["email", "email_address", "alumni_email"].includes(k));
  const hasNameHeader =
    firstKeys.some((k) => ["full_name", "name"].includes(k)) ||
    (firstKeys.includes("first_name") && firstKeys.includes("last_name"));

  if (!hasEmailHeader || !hasNameHeader) {
    throw new Error(
      "CSV must include an 'email' column and either 'full_name' (or 'name') or 'first_name' + 'last_name'."
    );
  }

  // Fetch existing emails from alumni_profiles for duplicate detection
  const { data: existingAlumni, error: dbErr } = await supabaseAdmin
    .from("alumni_profiles")
    .select("id, email, full_name, company, graduation_year");
  if (dbErr) throw dbErr;

  const existingByEmail = new Map(
    (existingAlumni || []).map((a) => [normalizeEmail(a.email), a])
  );

  const seenInCsv = new Set();
  const validRows = [];
  const errorRows = [];
  const duplicateRows = [];

  records.forEach((rawRow, idx) => {
    const rowNumber = idx + 2; // 1-indexed + header row
    const rawEmail = pickField(rawRow, ["email", "email_address", "alumni_email"]);
    const email = normalizeEmail(rawEmail);

    const rawFullName =
      pickField(rawRow, ["full_name", "name"]) ||
      `${pickField(rawRow, ["first_name"])} ${pickField(rawRow, ["last_name"])}`.trim();
    const fullName = normalizePersonName(rawFullName);

    const rawGradYear = pickField(rawRow, ["graduation_year", "batch", "passout_year", "year"]);
    const graduationYear = parseGraduationYear(rawGradYear);

    const company = normalizeCompany(pickField(rawRow, ["company", "organization", "employer"]));
    const jobTitle = sanitizeText(pickField(rawRow, ["job_title", "designation", "role", "position"]), 120);
    const industry = sanitizeText(pickField(rawRow, ["industry", "sector"]), 100);
    const degree = sanitizeText(pickField(rawRow, ["degree", "program"]), 100);
    const department = sanitizeText(pickField(rawRow, ["department", "branch", "major"]), 100);
    const location = sanitizeText(pickField(rawRow, ["location", "city", "country"]), 120);
    const linkedinUrl = sanitizeText(pickField(rawRow, ["linkedin_url", "linkedin"]), 250);
    const bio = sanitizeText(pickField(rawRow, ["bio", "about"]), 600);
    const yearsExp = parsePositiveNumber(pickField(rawRow, ["years_of_experience", "experience_years", "experience"]), 0);
    const skills = normalizeSkillsList(pickField(rawRow, ["skills", "skill_set", "technical_skills"]));
    const rawVerified = pickField(rawRow, ["is_verified", "verified"]).toLowerCase();
    const isVerified = ["true", "1", "yes", "verified"].includes(rawVerified);

    const rowErrors = [];
    if (!email || !isValidEmail(email)) rowErrors.push("Invalid or missing email address");
    if (!fullName || fullName.length < 2) rowErrors.push("Missing or invalid full_name");
    if (Number.isNaN(graduationYear)) rowErrors.push(`Invalid graduation_year '${rawGradYear}'`);
    if (linkedinUrl && !isValidUrl(linkedinUrl)) rowErrors.push("Invalid linkedin_url format");

    const normalizedRecord = {
      rowNumber,
      email,
      full_name: fullName,
      graduation_year: Number.isNaN(graduationYear) ? null : graduationYear,
      company: company || null,
      job_title: jobTitle || null,
      industry: industry || null,
      degree: degree || null,
      department: department || null,
      location: location || null,
      linkedin_url: linkedinUrl || null,
      bio: bio || null,
      years_of_experience: yearsExp,
      skills,
      is_verified: isVerified,
    };

    if (rowErrors.length > 0) {
      errorRows.push({
        ...normalizedRecord,
        errors: rowErrors,
      });
      return;
    }

    if (existingByEmail.has(email)) {
      duplicateRows.push({
        ...normalizedRecord,
        reason: "Email already exists in alumni database",
        existingRecord: existingByEmail.get(email),
      });
      return;
    }

    if (seenInCsv.has(email)) {
      duplicateRows.push({
        ...normalizedRecord,
        reason: "Duplicate email within uploaded CSV",
      });
      return;
    }

    seenInCsv.add(email);
    validRows.push(normalizedRecord);
  });

  return {
    totalRows: records.length,
    validRows,
    errorRows,
    duplicateRows,
  };
}

export async function commitAlumniImport({ adminId, fileName, validRows, duplicateRows, errorRows, totalRows }) {
  let importedCount = 0;
  const runtimeErrors = [...errorRows];
  const insertedRecords = [];

  for (const row of validRows) {
    try {
      // Check if an authenticated profile already exists for this email
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", row.email)
        .maybeSingle();

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("alumni_profiles")
        .insert({
          user_id: existingProfile?.id || null,
          email: row.email,
          full_name: row.full_name,
          graduation_year: row.graduation_year,
          degree: row.degree,
          department: row.department,
          company: row.company,
          job_title: row.job_title,
          industry: row.industry,
          location: row.location,
          linkedin_url: row.linkedin_url,
          bio: row.bio,
          years_of_experience: row.years_of_experience,
          is_verified: row.is_verified,
          verification_status: row.is_verified ? "verified" : "pending",
          verified_by: row.is_verified ? adminId : null,
          verified_at: row.is_verified ? new Date().toISOString() : null,
          import_source: "csv_import",
        })
        .select()
        .single();

      if (insertErr) {
        runtimeErrors.push({
          rowNumber: row.rowNumber,
          email: row.email,
          full_name: row.full_name,
          errors: [insertErr.message],
        });
        continue;
      }

      if (row.skills && row.skills.length > 0) {
        await syncUserSkills({
          alumniProfileId: inserted.id,
          skills: row.skills,
          source: "csv_import",
          replace: true,
        });
      }

      importedCount += 1;
      insertedRecords.push(inserted);
    } catch (err) {
      runtimeErrors.push({
        rowNumber: row.rowNumber,
        email: row.email,
        full_name: row.full_name,
        errors: [err.message],
      });
    }
  }

  const status =
    importedCount === 0 && validRows.length > 0
      ? "failed"
      : runtimeErrors.length > 0 || duplicateRows.length > 0
        ? "partial"
        : "completed";

  const { data: historyRow, error: historyErr } = await supabaseAdmin
    .from("alumni_import_history")
    .insert({
      admin_id: adminId,
      file_name: sanitizeText(fileName, 200),
      total_rows: totalRows,
      valid_rows: validRows.length,
      imported_rows: importedCount,
      duplicate_rows: duplicateRows.length,
      error_rows: runtimeErrors.length,
      errors_summary: runtimeErrors.slice(0, 100),
      duplicates_summary: duplicateRows.slice(0, 100),
      status,
    })
    .select()
    .single();

  if (historyErr) throw historyErr;

  return {
    history: historyRow,
    importedCount,
    duplicateCount: duplicateRows.length,
    errorCount: runtimeErrors.length,
    errors: runtimeErrors,
    duplicates: duplicateRows,
    insertedRecords,
  };
}
