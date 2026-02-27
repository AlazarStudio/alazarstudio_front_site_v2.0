import { getImageUrl } from '@/lib/api';

export function transliterate(text) {
  if (!text) return '';
  const source = String(text);
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
    ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo',
    Ж: 'Zh', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M',
    Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U',
    Ф: 'F', Х: 'H', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Sch',
    Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
  };

  return source
    .split('')
    .map((char) => map[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function extractPlainText(value) {
  if (value == null) return '';
  if (typeof value === 'string') {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(extractPlainText).join(' ').trim();
  if (typeof value === 'object') {
    if ('text' in value) return extractPlainText(value.text);
    if ('content' in value) return extractPlainText(value.content);
    if ('value' in value) return extractPlainText(value.value);
  }
  return '';
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const startsLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));
  if (!startsLikeJson) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function resolveField(record, key) {
  const raw = record?.[key];
  return parseMaybeJson(raw);
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

function collectImageLikeFields(record) {
  if (!record || typeof record !== 'object') return [];
  return Object.entries(record)
    .filter(([key]) => key !== 'additionalBlocks')
    .map(([key, value]) => ({ key, rawUrl: extractImageUrl(value) }))
    .filter((item) => item.rawUrl)
    .map((item) => ({ ...item, url: getImageUrl(item.rawUrl) }));
}

function resolveBooleanField(record, key) {
  const value = resolveField(record, key);
  if (typeof value === 'boolean') return value;
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = value.value;
    if (typeof inner === 'boolean') return inner;
    if (typeof inner === 'string') return inner.toLowerCase() === 'true';
    return Boolean(inner);
  }
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function normalizeCaseDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function resolveLogoImage(record) {
  const explicitLogoKeys = ['logotip', 'logo', 'brand_logo', 'logo_brenda'];
  for (const key of explicitLogoKeys) {
    const rawUrl = extractImageUrl(resolveField(record, key));
    if (rawUrl) return getImageUrl(rawUrl);
  }
  const imageFields = collectImageLikeFields(record);
  const byName = imageFields.find((item) => /(logo|logotip)/i.test(item.key));
  if (byName?.url) return byName.url;
  if (imageFields[0]?.url) return imageFields[0].url;
  if (Array.isArray(record.additionalBlocks)) {
    const imageBlock = record.additionalBlocks.find((block) => block?.type === 'image' && block?.data?.url);
    if (imageBlock?.data?.url) return getImageUrl(imageBlock.data.url);
  }
  return '/placeholder.jpg';
}

function resolvePreviewImage(record) {
  const previewKeys = ['prev_yu', 'prevyu', 'preview', 'previu', 'prev', 'kartinka_kartochki', 'oblozhka'];
  for (const key of previewKeys) {
    const rawUrl = extractImageUrl(resolveField(record, key));
    if (rawUrl) return getImageUrl(rawUrl);
  }
  const imageFields = collectImageLikeFields(record);
  const byName = imageFields.find((item) => /(prev|preview|oblozh|cover)/i.test(item.key));
  if (byName?.url) return byName.url;
  const notLogo = imageFields.find((item) => !/(logo|logotip)/i.test(item.key));
  if (notLogo?.url) return notLogo.url;
  return '';
}

function resolveDescription(record) {
  const parts = [];
  const zadacha = extractPlainText(resolveField(record, 'zadacha'));
  const reshenie = extractPlainText(resolveField(record, 'reshenie'));
  if (zadacha) parts.push(zadacha);
  if (reshenie) parts.push(reshenie);
  return parts.join(' ').trim();
}

export function mapCaseRecordToCard(record) {
  const titleField = resolveField(record, 'nazvanie');
  const title = extractPlainText(titleField?.text || titleField || record?.title || 'Без названия') || 'Без названия';
  const tagsField = resolveField(record, 'tegi');
  const tags = Array.isArray(tagsField?.selectedItems)
    ? tagsField.selectedItems
        .map((item) => extractPlainText(item?.label))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const id = String(record?.id || record?._id?.$oid || record?._id || title);

  const logoSrc = resolveLogoImage(record || {});
  const previewSrc = resolvePreviewImage(record || {});
  return {
    id,
    sourceRecord: record,
    type: 'case',
    imgSrc: previewSrc || logoSrc,
    logoSrc,
    title,
    description: resolveDescription(record || {}),
    tags,
    date: normalizeCaseDate(record?.created_at || record?.createdAt),
    url_text: transliterate(title) || `case-${id}`,
  };
}

export function isCaseForShop(record) {
  return resolveBooleanField(record, 'dlya_magazina');
}

export function mapCaseRecordToShopCard(record) {
  const base = mapCaseRecordToCard(record);
  return {
    ...base,
    type: 'shop',
    price: extractPlainText(resolveField(record, 'stoimost')) || 0,
  };
}

export function getCaseLogoUrl(caseRecord) {
  return resolveLogoImage(caseRecord || {});
}

export function mapTeamItems(teamResponse, caseRecord) {
  const teamField = resolveField(caseRecord, 'komanda');
  const selectedIds = Array.isArray(teamField?.selectedIds) ? teamField.selectedIds.map(String) : [];
  const selectedMap = new Map(
    Array.isArray(teamField?.selectedItems)
      ? teamField.selectedItems.map((item) => [String(item.id), item])
      : []
  );

  const rawTeam = Array.isArray(teamResponse) ? teamResponse : [];
  const byId = new Map(rawTeam.map((item) => [String(item.id || item._id?.$oid || item._id), item]));

  return selectedIds
    .map((id) => {
      const fromTeam = byId.get(id) || {};
      const fromSelected = selectedMap.get(id) || {};
      const fioField = parseMaybeJson(fromTeam.fio);
      const roleCandidates = [
        parseMaybeJson(fromTeam.professiya),
        parseMaybeJson(fromTeam.dolzhnost),
        parseMaybeJson(fromTeam.doljnost),
        parseMaybeJson(fromTeam.position),
        parseMaybeJson(fromTeam.role),
        parseMaybeJson(fromTeam.rol),
        parseMaybeJson(fromSelected.position),
        parseMaybeJson(fromSelected.role),
      ];
      const roleValue = roleCandidates.find((value) => extractPlainText(value).length > 0) || '';
      const name = extractPlainText((fioField && fioField.text) || fioField || fromTeam.name || fromSelected.label);
      const role = extractPlainText(roleValue);
      const image = fromTeam.foto || fromTeam.photo || fromSelected.image || '';
      return {
        id,
        name,
        role,
        image: image ? getImageUrl(image) : '/placeholder.jpg',
      };
    })
    .filter((member) => member.name);
}

export function formatCaseDateRu(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function getCaseTaskHtml(caseRecord) {
  const taskField = resolveField(caseRecord, 'zadacha');
  if (taskField && typeof taskField === 'object' && typeof taskField.content === 'string') return taskField.content;
  return typeof taskField === 'string' ? taskField : '';
}

export function getCaseSolutionHtml(caseRecord) {
  const solutionField = resolveField(caseRecord, 'reshenie');
  if (solutionField && typeof solutionField === 'object' && typeof solutionField.content === 'string') return solutionField.content;
  return typeof solutionField === 'string' ? solutionField : '';
}

export function getCaseViews(caseRecord) {
  const viewsField = resolveField(caseRecord, 'prosmotry');
  if (viewsField && typeof viewsField === 'object' && 'value' in viewsField) {
    const numeric = Number(viewsField.value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  const numeric = Number(viewsField);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function getCaseAdditionalImageUrls(caseRecord) {
  const additionalBlocksRaw = resolveField(caseRecord, 'additionalBlocks');
  const blocks = asArray(additionalBlocksRaw)
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block && typeof block === 'object')
    .sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.block?.order)) ? Number(a.block.order) : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(Number(b.block?.order)) ? Number(b.block.order) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.index - b.index;
    })
    .map(({ block }) => block);

  const urls = [];
  blocks.forEach((block) => {
    const type = String(block?.type || '').toLowerCase();
    const data = parseMaybeJson(block?.data);
    if (type === 'image') {
      const rawUrl = data?.url || data?.value;
      if (typeof rawUrl === 'string' && rawUrl.trim()) urls.push(getImageUrl(rawUrl));
      return;
    }
    if (type === 'gallery') {
      const images = Array.isArray(data?.images) ? data.images : [];
      images.forEach((img) => {
        if (typeof img === 'string' && img.trim()) urls.push(getImageUrl(img));
      });
    }
  });
  return urls;
}
