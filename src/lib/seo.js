export const SITE_BASE_URL = "https://xn--80aaa1as7a.xn--p1ai";
export const SITE_NAME = "Alazar Studio";
export const SITE_NAME_UPPER = "ALAZAR STUDIO";
export const DEFAULT_OG_IMAGE_PATH = "/alazar-logo.png";

export const ORG_CONTACT = {
  email: "info@alazarstudio.ru",
  telephone: "+7 928 399-53-84",
};

export function sanitizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function truncateText(value, maxLen) {
  const text = sanitizeText(value);
  if (!Number.isFinite(maxLen) || maxLen <= 0 || text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

export function buildCanonical(pathname = "/") {
  const safePath = typeof pathname === "string" && pathname.startsWith("/") ? pathname : "/";
  return new URL(safePath, SITE_BASE_URL).toString();
}

export function toAbsoluteUrl(url) {
  const raw = sanitizeText(url);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return new URL(raw.startsWith("/") ? raw : `/${raw}`, SITE_BASE_URL).toString();
}

export function withSiteName(title) {
  const cleanTitle = sanitizeText(title);
  return cleanTitle ? `${cleanTitle} | ${SITE_NAME}` : SITE_NAME;
}

export function resolveImageMeta({ alt, caption, description, title, fallbackDescription }) {
  const normalizedAlt = sanitizeText(alt) || sanitizeText(title) || sanitizeText(fallbackDescription);
  const normalizedCaption = sanitizeText(caption) || sanitizeText(title) || normalizedAlt;
  const normalizedDescription = sanitizeText(description) || sanitizeText(fallbackDescription) || normalizedCaption;
  return {
    alt: normalizedAlt,
    caption: normalizedCaption,
    description: normalizedDescription,
  };
}

export function buildSchemaImageObject({ url, alt, caption, description, title, fallbackDescription }) {
  const absoluteUrl = toAbsoluteUrl(url);
  if (!absoluteUrl) return null;
  const meta = resolveImageMeta({ alt, caption, description, title, fallbackDescription });
  return {
    "@type": "ImageObject",
    url: absoluteUrl,
    name: meta.alt || undefined,
    caption: meta.caption || undefined,
    description: meta.description || undefined,
  };
}

