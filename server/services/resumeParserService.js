import os from "node:os";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { normalizeSkillName } from "../utils/normalize.js";

// Bind pdf.js worker in-memory so serverless runtimes (e.g. Vercel) never fail resolving worker files on disk.
if (!globalThis.pdfjsWorker) {
  globalThis.pdfjsWorker = pdfjsWorker;
}

const TECHNICAL_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "Scala", "R",
  "React", "Next.js", "Vue.js", "Angular", "Svelte", "HTML5", "CSS3", "Tailwind CSS", "Bootstrap", "Sass", "Redux",
  "Node.js", "Express.js", "NestJS", "Django", "Flask", "FastAPI", "Spring Boot", "ASP.NET", "GraphQL", "REST APIs",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase", "Supabase", "Oracle", "Elasticsearch",
  "Docker", "Kubernetes", "AWS", "Google Cloud", "Azure", "Terraform", "CI/CD", "Git", "GitHub", "Linux", "Nginx",
  "Machine Learning", "Deep Learning", "Natural Language Processing", "Computer Vision", "TensorFlow", "PyTorch",
  "Scikit-Learn", "Pandas", "NumPy", "Data Analysis", "Power BI", "Tableau", "Apache Spark", "Hadoop",
  "UI/UX Design", "Figma", "Adobe XD", "System Design", "Microservices", "Cybersecurity", "Penetration Testing",
  "Unit Testing", "Jest", "Cypress", "Playwright", "React Native", "Flutter", "Agile", "Scrum", "Jira", "Postman",
];

const SOFT_SKILLS = [
  "Communication", "Leadership", "Problem Solving", "Teamwork", "Collaboration", "Time Management",
  "Critical Thinking", "Adaptability", "Public Speaking", "Project Management", "Mentoring",
  "Negotiation", "Presentation", "Analytical Thinking", "Attention to Detail", "Conflict Resolution",
];

const SKILL_PATTERNS = {
  "C++": /(?:^|[\s,;|/()])c\+\+(?=$|[\s,;|/().])/i,
  "C#": /(?:^|[\s,;|/()])c#(?=$|[\s,;|/().])/i,
  "Go": /\b(?:golang|Go)\b/,
  "R": /\b(?:RStudio|R(?=\s*[,;|/()]|\s+(?:programming|language|statistical)))\b/,
  "HTML5": /\bhtml5?\b/i,
  "CSS3": /\bcss3?\b/i,
  "React": /\breact(?:\.?js)?\b/i,
  "Next.js": /\bnext(?:\.?js)\b/i,
  "Node.js": /\bnode(?:\.?js)?\b/i,
  "Express.js": /\bexpress(?:\.?js)?\b/i,
  "Vue.js": /\bvue(?:\.?js)?\b/i,
  "Tailwind CSS": /\btailwind(?:\s*css)?\b/i,
  "REST APIs": /\brest(?:ful)?\s*apis?\b/i,
  "UI/UX Design": /\bui\s*\/?\s*ux(?:\s*design)?\b/i,
  "CI/CD": /\bci\s*\/?\s*cd\b/i,
  "Natural Language Processing": /\b(?:natural\s+language\s+processing|nlp)\b/i,
  "Machine Learning": /\bmachine\s+learning\b/i,
  "Deep Learning": /\bdeep\s+learning\b/i,
  "Scikit-Learn": /\b(?:scikit[-\s]?learn|sklearn)\b/i,
  "AWS": /\b(?:aws|amazon\s+web\s+services)\b/i,
  "Google Cloud": /\b(?:google\s+cloud|gcp)\b/i,
  "PostgreSQL": /\b(?:postgresql|postgres)\b/i,
  "MongoDB": /\bmongo(?:db)?\b/i,
  "JavaScript": /\b(?:javascript|js)\b/i,
  "TypeScript": /\b(?:typescript|ts)\b/i,
};

const CAREER_ROLE_BENCHMARKS = [
  {
    role: "Full-Stack Developer",
    industry: "Software & Technology",
    requiredSkills: ["JavaScript", "TypeScript", "React", "Node.js", "Express.js", "SQL", "PostgreSQL", "REST APIs", "Git", "Docker"],
  },
  {
    role: "Frontend Engineer",
    industry: "Software & Technology",
    requiredSkills: ["JavaScript", "TypeScript", "React", "Next.js", "HTML5", "CSS3", "Tailwind CSS", "Git", "UI/UX Design", "Jest"],
  },
  {
    role: "Backend Engineer",
    industry: "Software & Technology",
    requiredSkills: ["Node.js", "Python", "Java", "SQL", "PostgreSQL", "MongoDB", "REST APIs", "Docker", "System Design", "AWS"],
  },
  {
    role: "Data Scientist / ML Engineer",
    industry: "Artificial Intelligence & Data",
    requiredSkills: ["Python", "SQL", "Machine Learning", "Deep Learning", "Natural Language Processing", "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "Data Analysis"],
  },
  {
    role: "Cloud & DevOps Engineer",
    industry: "Cloud & Infrastructure",
    requiredSkills: ["Linux", "Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "Git", "Python", "System Design", "Nginx"],
  },
  {
    role: "Product Manager",
    industry: "Product & Strategy",
    requiredSkills: ["Product Management", "Agile", "Scrum", "Data Analysis", "SQL", "UI/UX Design", "Communication", "Leadership", "Project Management"],
  },
];

export function validatePdfBuffer(buffer, mimeType, originalName) {
  if (!buffer || buffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("Resume PDF exceeds maximum allowed size of 10 MB.");
  }
  const isPdfMime = mimeType === "application/pdf" || (originalName && originalName.toLowerCase().endsWith(".pdf"));
  if (!isPdfMime) {
    throw new Error("Only PDF resume files are allowed.");
  }
  const header = buffer.subarray(0, 5).toString("ascii");
  if (header !== "%PDF-") {
    throw new Error("Invalid PDF file signature. Please upload a valid PDF document.");
  }
}

function reconstructPageLines(textContent) {
  const lines = [];
  let currentLine = "";
  let lastY = null;

  for (const item of textContent.items || []) {
    const str = typeof item.str === "string" ? item.str : "";
    const y = Array.isArray(item.transform) ? item.transform[5] : null;

    if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = str;
    } else {
      if (currentLine && str && !currentLine.endsWith(" ") && !str.startsWith(" ")) {
        currentLine += " ";
      }
      currentLine += str;
    }

    if (item.hasEOL) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = "";
      lastY = null;
    } else if (y !== null) {
      lastY = y;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join("\n");
}

async function extractWithPdfJs(buffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });
  const pdfDoc = await loadingTask.promise;
  try {
    const pageTexts = [];
    const maxPages = Math.min(pdfDoc.numPages, 15);
    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = reconstructPageLines(textContent);
      if (pageText) pageTexts.push(pageText);
    }
    return pageTexts.join("\n").trim();
  } finally {
    await pdfDoc.destroy?.();
  }
}

async function extractWithPdfParse(buffer) {
  const { default: pdfParse } = await import("pdf-parse");
  const parsed = await pdfParse(buffer);
  return (parsed?.text || "").trim();
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function runOcrFallback(buffer) {
  const [{ createCanvas }, { createWorker }] = await Promise.all([
    import("@napi-rs/canvas"),
    import("tesseract.js"),
  ]);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });
  const pdfDoc = await loadingTask.promise;
  const worker = await createWorker("eng", 1, {
    cachePath: os.tmpdir(),
    logger: () => {},
  });

  try {
    const maxPages = Math.min(pdfDoc.numPages, 2);
    const pageTexts = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");

      await page.render({ canvasContext: context, viewport }).promise;
      const pngBuffer = canvas.toBuffer("image/png");

      const { data } = await worker.recognize(pngBuffer);
      if (data?.text) {
        pageTexts.push(data.text);
      }
    }

    return pageTexts.join("\n").trim();
  } finally {
    await worker.terminate().catch(() => {});
    await pdfDoc.destroy?.();
  }
}

export async function extractTextFromPdf(buffer) {
  let text = "";
  let method = "pdfjs";

  try {
    text = await extractWithPdfJs(buffer);
  } catch {
    text = "";
  }

  let meaningfulLength = text.replace(/\s+/g, "").length;
  if (meaningfulLength < 80) {
    try {
      const parsedText = await extractWithPdfParse(buffer);
      if (parsedText.replace(/\s+/g, "").length > meaningfulLength) {
        text = parsedText;
        method = "pdf-parse";
        meaningfulLength = text.replace(/\s+/g, "").length;
      }
    } catch {
      // continue to OCR fallback if still insufficient text
    }
  }

  if (meaningfulLength < 80) {
    try {
      const ocrText = await withTimeout(
        runOcrFallback(buffer),
        15000,
        "OCR timed out while reading a scanned PDF. Please upload a text-based PDF."
      );
      if (ocrText.replace(/\s+/g, "").length > meaningfulLength) {
        text = ocrText;
        method = "tesseract-ocr";
      }
    } catch (ocrErr) {
      if (!text) {
        throw new Error(`Unable to extract text from PDF: ${ocrErr.message}`);
      }
    }
  }

  if (!text || text.replace(/\s+/g, "").length < 20) {
    throw new Error("No readable text could be extracted from this PDF.");
  }

  return { text, method };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMatchedSkills(text, catalog) {
  const found = [];
  const seen = new Set();

  for (const skill of catalog) {
    const pattern = SKILL_PATTERNS[skill] || new RegExp(`\\b${escapeRegex(skill)}\\b`, "i");
    if (pattern.test(text)) {
      const normalized = normalizeSkillName(skill);
      const key = normalized.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        found.push(normalized);
      }
    }
  }
  return found;
}

function splitSections(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sectionHeaders = [
    { key: "education", regex: /^(education|academic background|academics|qualifications)$/i },
    { key: "experience", regex: /^(experience|work experience|employment|professional experience|internships)$/i },
    { key: "projects", regex: /^(projects|personal projects|academic projects|key projects)$/i },
    { key: "certifications", regex: /^(certifications|certificates|licenses & certifications|licenses)$/i },
    { key: "skills", regex: /^(skills|technical skills|core competencies|technologies)$/i },
    { key: "summary", regex: /^(summary|profile|objective|career objective|about me)$/i },
  ];

  const sections = {
    summary: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    skills: [],
    general: [],
  };

  let current = "general";
  for (const line of lines) {
    const cleanedHeading = line.replace(/[:\-_]+$/, "").trim();
    const matchedHeader = sectionHeaders.find((h) => h.regex.test(cleanedHeading));
    if (matchedHeader && line.length <= 45) {
      current = matchedHeader.key;
      continue;
    }
    sections[current].push(line);
  }

  return { lines, sections };
}

function extractEducationEntries(sections, lines) {
  const source = sections.education.length > 0 ? sections.education : lines;
  const degreeRegex = /\b(b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?sc|m\.?sc|bca|mca|mba|ph\.?d|bachelor|master|diploma|high school)\b/i;
  const entries = [];

  for (let i = 0; i < source.length; i += 1) {
    const line = source[i];
    if (degreeRegex.test(line) || (sections.education.length > 0 && /\b(university|college|institute|school)\b/i.test(line))) {
      const yearMatch = line.match(/\b(19\d{2}|20\d{2})\b/g);
      const nextLine = source[i + 1] && !degreeRegex.test(source[i + 1]) ? source[i + 1] : "";
      entries.push({
        title: line.slice(0, 140),
        institution: /\b(university|college|institute|school)\b/i.test(line) ? line.slice(0, 120) : nextLine.slice(0, 120),
        years: yearMatch ? yearMatch.join(" - ") : "",
      });
    }
  }

  return entries.slice(0, 6);
}

function extractExperienceEntries(sections, lines) {
  const source = sections.experience.length > 0 ? sections.experience : lines;
  const roleRegex = /\b(engineer|developer|intern|analyst|manager|consultant|architect|designer|researcher|associate|lead|specialist)\b/i;
  const dateRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|20\d{2}|present|current)\b/i;
  const entries = [];

  for (let i = 0; i < source.length; i += 1) {
    const line = source[i];
    if (line.length > 140) continue;
    if ((sections.experience.length > 0 && dateRegex.test(line)) || (roleRegex.test(line) && dateRegex.test(line))) {
      entries.push({
        title: line.slice(0, 140),
        details: source[i + 1] ? source[i + 1].slice(0, 220) : "",
      });
    }
  }

  if (entries.length === 0 && sections.experience.length > 0) {
    for (const line of sections.experience.slice(0, 4)) {
      if (line.length > 12) {
        entries.push({ title: line.slice(0, 140), details: "" });
      }
    }
  }

  return entries.slice(0, 8);
}

function extractProjectEntries(sections) {
  if (sections.projects.length === 0) return [];
  const entries = [];
  for (const line of sections.projects) {
    if (line.startsWith("•") || line.startsWith("-") || line.length > 140) continue;
    if (line.length >= 6) {
      entries.push({ name: line.slice(0, 120) });
    }
    if (entries.length >= 6) break;
  }
  return entries;
}

function extractCertificationEntries(sections, lines) {
  const source = sections.certifications.length > 0 ? sections.certifications : lines;
  const certRegex = /\b(certified|certification|certificate|aws|azure|gcp|coursera|udemy|google|meta|oracle|cisco)\b/i;
  const entries = [];
  for (const line of source) {
    if (sections.certifications.length > 0 || certRegex.test(line)) {
      if (line.length >= 5 && line.length <= 150) {
        entries.push(line);
      }
    }
    if (entries.length >= 8) break;
  }
  return entries;
}

export function analyzeResumeText({ rawText, targetRoleInput = "", alumniSkillFrequency = [] }) {
  const { lines, sections } = splitSections(rawText);

  const technicalSkills = extractMatchedSkills(rawText, TECHNICAL_SKILLS);
  const softSkills = extractMatchedSkills(rawText, SOFT_SKILLS);
  const education = extractEducationEntries(sections, lines);
  const workExperience = extractExperienceEntries(sections, lines);
  const projects = extractProjectEntries(sections);
  const certifications = extractCertificationEntries(sections, lines);

  const studentSkillSet = new Set([...technicalSkills, ...softSkills].map((s) => s.toLowerCase()));

  // Evaluate career roles from extracted skills
  const careerRecommendations = CAREER_ROLE_BENCHMARKS.map((benchmark) => {
    const matched = benchmark.requiredSkills.filter((s) => studentSkillSet.has(s.toLowerCase()));
    const missing = benchmark.requiredSkills.filter((s) => !studentSkillSet.has(s.toLowerCase()));
    const fitScore = Math.round((matched.length / benchmark.requiredSkills.length) * 100);
    return {
      role: benchmark.role,
      industry: benchmark.industry,
      fitScore,
      matchedSkills: matched,
      missingSkills: missing,
    };
  }).sort((a, b) => b.fitScore - a.fitScore);

  const chosenBenchmark =
    (targetRoleInput &&
      careerRecommendations.find((b) => b.role.toLowerCase().includes(targetRoleInput.toLowerCase()))) ||
    careerRecommendations[0];

  // Combine role benchmark missing skills + in-demand verified alumni skills
  const missingRoleSkills = chosenBenchmark?.missingSkills || [];
  const alumniInDemandMissing = alumniSkillFrequency
    .filter((item) => !studentSkillSet.has(item.name.toLowerCase()))
    .slice(0, 6)
    .map((item) => ({
      skill: item.name,
      reason: `Present in ${item.count} verified alumni profile${item.count === 1 ? "" : "s"}`,
      priority: "high",
      source: "alumni_network",
    }));

  const roleGapEntries = missingRoleSkills.map((skill) => ({
    skill,
    reason: `Core competency for ${chosenBenchmark.role}`,
    priority: "recommended",
    source: "role_benchmark",
  }));

  const seenGap = new Set();
  const skillGaps = [];
  for (const gap of [...roleGapEntries, ...alumniInDemandMissing]) {
    const key = gap.skill.toLowerCase();
    if (!seenGap.has(key)) {
      seenGap.add(key);
      skillGaps.push(gap);
    }
  }

  const recommendedSkills = skillGaps.slice(0, 10).map((g) => g.skill);

  // Transparent completeness scoring based solely on extracted evidence
  let completeness = 0;
  if (technicalSkills.length >= 5) completeness += 30;
  else completeness += technicalSkills.length * 6;

  if (softSkills.length >= 2) completeness += 10;
  else completeness += softSkills.length * 5;

  if (education.length > 0) completeness += 20;
  if (workExperience.length > 0) completeness += 20;
  if (projects.length > 0) completeness += 10;
  if (certifications.length > 0) completeness += 10;
  completeness = Math.min(100, completeness);

  const improvementSuggestions = [];
  if (technicalSkills.length < 5) {
    improvementSuggestions.push("Add more concrete technical tools, languages, and frameworks relevant to your target role.");
  }
  if (softSkills.length < 2) {
    improvementSuggestions.push("Highlight leadership, communication, and collaboration outcomes in your experience bullets.");
  }
  if (education.length === 0) {
    improvementSuggestions.push("Ensure your Education section clearly states degree, institution, and graduation year.");
  }
  if (workExperience.length === 0) {
    improvementSuggestions.push("Include internships, freelance work, or academic assistantships with measurable results.");
  }
  if (projects.length === 0) {
    improvementSuggestions.push("Add a Projects section demonstrating end-to-end architecture and deployed deliverables.");
  }
  if (certifications.length === 0) {
    improvementSuggestions.push("Consider adding verified certifications (e.g., AWS, Google Cloud, or domain credentials).");
  }
  if (recommendedSkills.length > 0) {
    improvementSuggestions.push(
      `To strengthen alignment for ${chosenBenchmark.role}, prioritize learning: ${recommendedSkills.slice(0, 4).join(", ")}.`
    );
  }

  const summary = `Extracted ${technicalSkills.length} technical skills, ${softSkills.length} soft skills, ${education.length} education entries, ${workExperience.length} experience items, and ${projects.length} projects. Closest role fit: ${chosenBenchmark.role} (${chosenBenchmark.fitScore}%).`;

  return {
    technicalSkills,
    softSkills,
    education,
    workExperience,
    projects,
    certifications,
    targetRole: chosenBenchmark.role,
    skillGaps,
    recommendedSkills,
    careerRecommendations: careerRecommendations.slice(0, 4),
    improvementSuggestions,
    completenessScore: completeness,
    summary,
  };
}
