import { useEffect } from "react";
import {
  DEFAULT_OG_IMAGE_PATH,
  SITE_NAME,
  buildCanonical,
  sanitizeText,
  toAbsoluteUrl,
  truncateText,
} from "@/lib/seo";

function upsertMetaByName(name, content) {
  if (!name) return;
  let node = document.querySelector(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("name", name);
    node.setAttribute("data-seo-managed", "true");
    document.head.appendChild(node);
  }
  node.setAttribute("content", content || "");
}

function upsertMetaByProperty(property, content) {
  if (!property) return;
  let node = document.querySelector(`meta[property="${property}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("property", property);
    node.setAttribute("data-seo-managed", "true");
    document.head.appendChild(node);
  }
  node.setAttribute("content", content || "");
}

function upsertCanonical(url) {
  let node = document.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    node.setAttribute("data-seo-managed", "true");
    document.head.appendChild(node);
  }
  node.setAttribute("href", url);
}

export function useSeo({
  enabled = true,
  title,
  description,
  pathname = "/",
  robots = "index,follow",
  ogType = "website",
  ogImage,
  schema,
  schemaId = "schema-page",
}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const normalizedTitle = truncateText(title, 80) || SITE_NAME;
    const normalizedDescription = truncateText(description, 180);
    const canonical = buildCanonical(pathname);
    const absoluteOgImage = toAbsoluteUrl(ogImage || DEFAULT_OG_IMAGE_PATH);

    document.title = normalizedTitle;
    upsertMetaByName("description", normalizedDescription);
    upsertMetaByName("robots", sanitizeText(robots || "index,follow"));
    upsertCanonical(canonical);

    upsertMetaByProperty("og:type", ogType || "website");
    upsertMetaByProperty("og:site_name", SITE_NAME);
    upsertMetaByProperty("og:locale", "ru_RU");
    upsertMetaByProperty("og:url", canonical);
    upsertMetaByProperty("og:title", normalizedTitle);
    upsertMetaByProperty("og:description", normalizedDescription);
    if (absoluteOgImage) {
      upsertMetaByProperty("og:image", absoluteOgImage);
    }

    if (schema) {
      let script = document.getElementById(schemaId);
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = schemaId;
        script.setAttribute("data-seo-schema-managed", "true");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    }

    return () => {
      if (!schemaId) return;
      const existingScript = document.getElementById(schemaId);
      if (existingScript) existingScript.remove();
    };
  }, [enabled, title, description, pathname, robots, ogType, ogImage, schema, schemaId]);
}

