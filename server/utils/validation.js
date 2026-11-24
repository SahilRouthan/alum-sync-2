const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidEmail(email) {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

export function isValidUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function isValidUrl(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseGraduationYear(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  const currentYear = new Date().getFullYear() + 8;
  if (!Number.isInteger(num) || num < 1950 || num > currentYear) {
    return NaN;
  }
  return num;
}

export function parsePositiveNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return fallback;
  return num;
}
