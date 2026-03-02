import { getImageUrl } from '@/lib/api';
import { extractPlainText, transliterate } from '@/components/Blocks/Cases/casesHelpers';

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));
  if (!looksLikeJson) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function resolveField(record, key) {
  return parseMaybeJson(record?.[key]);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function extractImageUrl(value) {
  const parsed = parseMaybeJson(value);
  if (typeof parsed === 'string' && parsed.trim()) return parsed;
  if (parsed && typeof parsed === 'object') {
    if (parsed.type === 'url' && typeof parsed.value === 'string' && parsed.value.trim()) return parsed.value;
    if (typeof parsed.url === 'string' && parsed.url.trim()) return parsed.url;
    if (typeof parsed.value === 'string' && parsed.value.trim()) return parsed.value;
  }
  return '';
}

function resolvePreviewImage(record) {
  const imageKeys = ['prev_yu', 'prevyu', 'preview', 'oblozhka', 'kartinka'];
  for (const key of imageKeys) {
    const rawUrl = extractImageUrl(resolveField(record, key));
    if (rawUrl) return getImageUrl(rawUrl);
  }
  return '/placeholder.jpg';
}

function resolveTitle(record) {
  const titleCandidates = [
    resolveField(record, 'nazvanie'),
    resolveField(record, 'title'),
    resolveField(record, 'zagolovok'),
  ];
  for (const candidate of titleCandidates) {
    const plain = extractPlainText(candidate?.text || candidate);
    if (plain) return plain;
  }
  return 'Без названия';
}

function resolveDescription(record) {
  const shortDescriptionCandidates = [
    resolveField(record, 'kratkoe_opisanie'),
    resolveField(record, 'kratkoeOpisanie'),
    resolveField(record, 'short_description'),
    resolveField(record, 'shortDescription'),
    resolveField(record, 'anons'),
  ];
  for (const candidate of shortDescriptionCandidates) {
    const plain = extractPlainText(candidate?.content || candidate?.text || candidate);
    if (plain) return plain;
  }

  const directCandidates = [
    resolveField(record, 'opisanie'),
    resolveField(record, 'description'),
    resolveField(record, 'tekst'),
    resolveField(record, 'text'),
    resolveField(record, 'content'),
  ];
  for (const candidate of directCandidates) {
    const plain = extractPlainText(candidate?.content || candidate);
    if (plain) return plain;
  }

  return '';
}

function resolveDate(record) {
  const rawDate = resolveField(record, 'data') || record?.created_at || record?.createdAt;
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

export function getNewsAdditionalBlocks(record) {
  const additionalRaw = resolveField(record, 'additionalBlocks');
  return asArray(additionalRaw)
    .filter((block) => block && typeof block === 'object')
    .sort((a, b) => {
      const aOrder = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
}

export function mapNewsRecordToCard(record) {
  const title = resolveTitle(record || {});
  const id = String(record?.id || record?._id?.$oid || record?._id || title);
  return {
    id,
    sourceRecord: record,
    type: 'new',
    imgSrc: resolvePreviewImage(record || {}),
    title,
    description: resolveDescription(record || {}),
    tags: ['Новости'],
    date: resolveDate(record || {}),
    url_text: transliterate(title) || `news-${id}`,
  };
}

function resolveStockDate(record) {
  const rawDate = resolveField(record, 'data') || record?.created_at || record?.createdAt;
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

export function isStockActual(record) {
  const isoDate = resolveStockDate(record || {});
  if (!isoDate) return true;
  const now = new Date();
  const endDate = new Date(isoDate);
  return endDate.getTime() >= now.getTime();
}

export function mapStockRecordToCard(record) {
  const title = resolveTitle(record || {});
  const id = String(record?.id || record?._id?.$oid || record?._id || title);
  return {
    id,
    sourceRecord: record,
    type: 'banner',
    imgSrc: resolvePreviewImage(record || {}),
    title,
    description: resolveDescription(record || {}),
    tags: ['Акция'],
    date: resolveStockDate(record || {}),
    url_text: transliterate(title) || `stock-${id}`,
  };
}
