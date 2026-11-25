import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const intentsPath = path.resolve(__dirname, "../data/chatbotIntents.json");
const intentsData = JSON.parse(fs.readFileSync(intentsPath, "utf8"));

const STOP_WORDS = new Set(["a", "an", "the", "to", "for", "of", "in", "on", "is", "are", "i", "me", "my", "can"]);

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s&+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemToken(token) {
  if (token.length <= 3) return token;
  if (token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(stemToken);
}

// Precompute inverse document frequency weights across all intent patterns
const allIntents = intentsData.intents || [];
const docFreq = new Map();
let totalPatternDocs = 0;

for (const intent of allIntents) {
  for (const pattern of intent.patterns || []) {
    totalPatternDocs += 1;
    const uniqueTokens = new Set(tokenize(pattern));
    for (const tok of uniqueTokens) {
      docFreq.set(tok, (docFreq.get(tok) || 0) + 1);
    }
  }
}

function scoreSimilarity(inputTokens, patternTokens) {
  if (inputTokens.length === 0 || patternTokens.length === 0) return 0;

  const inputSet = new Set(inputTokens);
  const patternSet = new Set(patternTokens);

  let intersectionWeight = 0;
  let unionWeight = 0;

  const allTokens = new Set([...inputSet, ...patternSet]);
  for (const tok of allTokens) {
    const idf = Math.log(1 + totalPatternDocs / (1 + (docFreq.get(tok) || 0)));
    unionWeight += idf;
    if (inputSet.has(tok) && patternSet.has(tok)) {
      intersectionWeight += idf;
    }
  }

  return unionWeight > 0 ? intersectionWeight / unionWeight : 0;
}

function pickRandom(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return "I'm sorry, I didn't understand that. Please select an option from the menu.";
  }
  return items[Math.floor(Math.random() * items.length)];
}

export function classifyIntent(message) {
  const normalizedInput = normalizeText(message);
  const fallbackIntent = allIntents.find((i) => i.tag === "fallback");

  if (!normalizedInput) {
    return fallbackIntent;
  }

  // 1. Exact normalized match (handles all preset menu buttons and exact greetings)
  for (const intent of allIntents) {
    for (const pattern of intent.patterns || []) {
      if (normalizeText(pattern) === normalizedInput) {
        return intent;
      }
    }
  }

  // 2. Substring / TF-IDF weighted token overlap match
  const inputTokens = tokenize(message);
  let bestIntent = null;
  let bestScore = 0;

  for (const intent of allIntents) {
    for (const pattern of intent.patterns || []) {
      const normPattern = normalizeText(pattern);
      let score = scoreSimilarity(inputTokens, tokenize(pattern));
      if (normPattern.length >= 4 && (normalizedInput.includes(normPattern) || normPattern.includes(normalizedInput))) {
        score = Math.max(score, 0.72);
      }
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }
  }

  if (bestIntent && bestScore >= 0.35) {
    return bestIntent;
  }

  return fallbackIntent;
}

export async function getChatbotReply(message) {
  const externalUrl = process.env.CHATBOT_BACKEND_URL?.trim();
  const localMatch = classifyIntent(message);

  // If a dedicated Python Flask chatbot service is configured (e.g. MENU-CHATBOT/Backend/app.py),
  // query it first and merge route hints, falling back gracefully to the built-in Node classifier.
  if (externalUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(externalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const data = await res.json();
        if (data?.response) {
          return {
            response: data.response,
            options: Array.isArray(data.options) ? data.options : [],
            tag: localMatch?.tag || "external",
            route: localMatch?.route || null,
          };
        }
      }
    } catch {
      // Fall back seamlessly to local NLP intent classifier
    }
  }

  return {
    response: pickRandom(localMatch?.responses),
    options: localMatch?.options || ["Main Menu"],
    tag: localMatch?.tag || "fallback",
    route: localMatch?.route || null,
  };
}
