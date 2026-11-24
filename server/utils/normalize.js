export function sanitizeText(value, maxLen = 2000) {
  if (value === null || value === undefined) return "";
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLen);
}

export function normalizeEmail(email) {
  if (!email) return "";
  return String(email).trim().toLowerCase();
}

export function normalizePersonName(name) {
  if (!name) return "";
  return String(name)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ""))
    .join(" ");
}

const COMPANY_ALIASES = {
  google: "Google",
  "google llc": "Google",
  microsoft: "Microsoft",
  "microsoft corporation": "Microsoft",
  amazon: "Amazon",
  aws: "Amazon Web Services",
  meta: "Meta",
  facebook: "Meta",
  tcs: "Tata Consultancy Services",
  infosys: "Infosys",
  wipro: "Wipro",
  ibm: "IBM",
  oracle: "Oracle",
  adobe: "Adobe",
  flipkart: "Flipkart",
  deloitte: "Deloitte",
  accenture: "Accenture",
};

export function normalizeCompany(company) {
  const cleaned = sanitizeText(company, 150).replace(/\s+/g, " ");
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  return COMPANY_ALIASES[lower] || cleaned;
}

const SKILL_ALIASES = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  reactjs: "React",
  "react.js": "React",
  react: "React",
  nodejs: "Node.js",
  "node.js": "Node.js",
  node: "Node.js",
  expressjs: "Express.js",
  "express.js": "Express.js",
  express: "Express.js",
  nextjs: "Next.js",
  "next.js": "Next.js",
  py: "Python",
  python: "Python",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  psql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  dl: "Deep Learning",
  "deep learning": "Deep Learning",
  nlp: "Natural Language Processing",
  "natural language processing": "Natural Language Processing",
  ai: "Artificial Intelligence",
  "artificial intelligence": "Artificial Intelligence",
  aws: "AWS",
  gcp: "Google Cloud",
  "google cloud": "Google Cloud",
  docker: "Docker",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  git: "Git",
  sql: "SQL",
  java: "Java",
  "c++": "C++",
  cpp: "C++",
  "rest api": "REST APIs",
  "rest apis": "REST APIs",
  restful: "REST APIs",
  graphql: "GraphQL",
  "ui/ux": "UI/UX Design",
  "ui ux": "UI/UX Design",
  "ui/ux design": "UI/UX Design",
  "product management": "Product Management",
  "data analysis": "Data Analysis",
  "system design": "System Design",
  "project management": "Project Management",
  communication: "Communication",
  leadership: "Leadership",
  teamwork: "Teamwork",
  "problem solving": "Problem Solving",
  "public speaking": "Public Speaking",
  "critical thinking": "Critical Thinking",
};

export function normalizeSkillName(skill) {
  const cleaned = sanitizeText(skill, 80).replace(/\s+/g, " ");
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  if (SKILL_ALIASES[lower]) return SKILL_ALIASES[lower];
  return cleaned
    .split(" ")
    .map((word) => (word.length <= 3 && word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

export function normalizeSkillsList(input) {
  const rawList = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[;,|]/g)
      : [];

  const seen = new Set();
  const result = [];
  for (const item of rawList) {
    const normalized = normalizeSkillName(item);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}
