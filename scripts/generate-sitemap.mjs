import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const configPath = path.join(publicDir, "config.json");
const outputPath = path.join(publicDir, "sitemap.xml");

const SITE_BASE_URL = "https://xn--80aaa1as7a.xn--p1ai";
const DEFAULT_LASTMOD = new Date().toISOString();

const STATIC_URLS = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/cases", changefreq: "daily", priority: "0.9" },
  { path: "/news", changefreq: "daily", priority: "0.9" },
  { path: "/shop", changefreq: "daily", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contacts", changefreq: "monthly", priority: "0.7" },
];

function readBackendApiUrl() {
  try {
    if (!fs.existsSync(configPath)) return "";
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    return String(parsed?.backendApiUrl || "").trim();
  } catch (error) {
    console.warn("[sitemap] config.json read failed:", error?.message || error);
    return "";
  }
}

function normalizeApiBase(url) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) return "";
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

function safeText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const looksLikeJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (!looksLikeJson) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function extractText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return safeText(value);
  }
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join(" ").trim();
  if (typeof value === "object") {
    if ("text" in value) return extractText(value.text);
    if ("content" in value) return extractText(value.content);
    if ("value" in value) return extractText(value.value);
    if ("label" in value) return extractText(value.label);
  }
  return "";
}

function transliterate(text) {
  const source = String(text || "");
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
    А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "Yo",
    Ж: "Zh", З: "Z", И: "I", Й: "Y", К: "K", Л: "L", М: "M",
    Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U",
    Ф: "F", Х: "H", Ц: "Ts", Ч: "Ch", Ш: "Sh", Щ: "Sch",
    Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu", Я: "Ya",
  };
  return source
    .split("")
    .map((char) => map[char] || char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function resolveRecordDate(record) {
  const raw = record?.updated_at || record?.updatedAt || record?.created_at || record?.createdAt || record?.data;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? DEFAULT_LASTMOD : parsed.toISOString();
}

function normalizePublicItemsResponse(payload, key) {
  if (Array.isArray(payload)) return payload;
  const data = payload && typeof payload === "object" ? payload : {};
  if (Array.isArray(data[key])) return data[key];
  if (Array.isArray(data.items)) return data.items;
  const firstArray = Object.values(data).find((value) => Array.isArray(value));
  return Array.isArray(firstArray) ? firstArray : [];
}

async function fetchPublicList(apiBase, endpoint, key) {
  const url = `${apiBase}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${endpoint} ${response.status}`);
  const data = await response.json();
  return normalizePublicItemsResponse(data, key);
}

function boolField(record, key) {
  const parsed = parseMaybeJson(record?.[key]);
  if (typeof parsed === "boolean") return parsed;
  if (parsed && typeof parsed === "object" && "value" in parsed) {
    const inner = parsed.value;
    if (typeof inner === "boolean") return inner;
    if (typeof inner === "string") return inner.toLowerCase() === "true";
    return Boolean(inner);
  }
  if (typeof parsed === "string") return parsed.toLowerCase() === "true";
  return Boolean(parsed);
}

function titleFromRecord(record) {
  return (
    extractText(parseMaybeJson(record?.nazvanie)) ||
    extractText(parseMaybeJson(record?.title)) ||
    extractText(parseMaybeJson(record?.zagolovok)) ||
    "item"
  );
}

function urlTextFromRecord(record, fallbackPrefix) {
  const direct = safeText(record?.url_text);
  if (direct) return direct;
  const title = titleFromRecord(record);
  const slug = transliterate(title);
  if (slug) return slug;
  const id = safeText(record?.id || record?._id?.$oid || record?._id);
  return `${fallbackPrefix}-${id || Date.now()}`;
}

function teamSlugFromRecord(record) {
  const direct = safeText(record?.url_text || record?.slug);
  if (direct) return direct;
  const fio = extractText(parseMaybeJson(record?.fio || record?.name || record?.title));
  const translit = transliterate(fio);
  if (translit) return translit;
  return safeText(record?.id || record?._id?.$oid || record?._id);
}

function createUrlEntry(pathname, options = {}) {
  const loc = new URL(pathname, SITE_BASE_URL).toString();
  return {
    loc,
    lastmod: options.lastmod || DEFAULT_LASTMOD,
    changefreq: options.changefreq || "weekly",
    priority: options.priority || "0.6",
  };
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toSitemapXml(entries) {
  const urlset = entries
    .map(
      (entry) => `  <url>
    <loc>${xmlEscape(entry.loc)}</loc>
    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>
    <changefreq>${xmlEscape(entry.changefreq)}</changefreq>
    <priority>${xmlEscape(entry.priority)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>
`;
}

function dedupeEntries(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    if (!entry?.loc) return;
    map.set(entry.loc, entry);
  });
  return Array.from(map.values()).sort((a, b) => a.loc.localeCompare(b.loc));
}

async function collectDynamicEntries(apiBase) {
  const [cases, news, stocks, team] = await Promise.all([
    fetchPublicList(apiBase, "/cases/public?page=1&limit=2000", "cases"),
    fetchPublicList(apiBase, "/news/public?page=1&limit=2000", "news"),
    fetchPublicList(apiBase, "/stocks/public?page=1&limit=2000", "stocks"),
    fetchPublicList(apiBase, "/team/public?page=1&limit=2000", "team"),
  ]);

  const dynamic = [];

  cases.forEach((record) => {
    const urlText = urlTextFromRecord(record, "case");
    const lastmod = resolveRecordDate(record);
    dynamic.push(createUrlEntry(`/cases/${urlText}`, { lastmod, changefreq: "weekly", priority: "0.8" }));
    if (boolField(record, "dlya_magazina")) {
      dynamic.push(createUrlEntry(`/shop/${urlText}`, { lastmod, changefreq: "weekly", priority: "0.8" }));
      dynamic.push(createUrlEntry(`/shopitem/${urlText}`, { lastmod, changefreq: "weekly", priority: "0.7" }));
    }
  });

  news.forEach((record) => {
    const urlText = urlTextFromRecord(record, "news");
    const lastmod = resolveRecordDate(record);
    dynamic.push(createUrlEntry(`/news/${urlText}`, { lastmod, changefreq: "weekly", priority: "0.8" }));
  });

  stocks.forEach((record) => {
    const urlText = urlTextFromRecord(record, "stock");
    const lastmod = resolveRecordDate(record);
    dynamic.push(createUrlEntry(`/banner/${urlText}`, { lastmod, changefreq: "weekly", priority: "0.7" }));
  });

  team.forEach((record) => {
    const memberSlug = teamSlugFromRecord(record);
    if (!memberSlug) return;
    dynamic.push(createUrlEntry(`/team/${memberSlug}`, {
      lastmod: resolveRecordDate(record),
      changefreq: "monthly",
      priority: "0.7",
    }));
  });

  return dynamic;
}

async function main() {
  const apiBase = normalizeApiBase(readBackendApiUrl() || process.env.SITEMAP_API_BASE || process.env.VITE_BACKEND_URL);
  const staticEntries = STATIC_URLS.map((entry) => createUrlEntry(entry.path, entry));
  let dynamicEntries = [];

  if (apiBase) {
    try {
      dynamicEntries = await collectDynamicEntries(apiBase);
    } catch (error) {
      console.warn("[sitemap] dynamic URLs fetch failed, fallback to static only:", error?.message || error);
    }
  } else {
    console.warn("[sitemap] API base URL not found, generating static sitemap only.");
  }

  const entries = dedupeEntries([...staticEntries, ...dynamicEntries]);
  const xml = toSitemapXml(entries);
  fs.writeFileSync(outputPath, xml, "utf-8");
  console.log(`[sitemap] generated: ${entries.length} URLs -> ${outputPath}`);
}

main().catch((error) => {
  console.error("[sitemap] generation failed:", error);
  process.exitCode = 1;
});
