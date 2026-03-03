'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye, EyeOff, ExternalLink, Plus, Pencil, RotateCcw, Settings, Trash2, X } from 'lucide-react';
import { dynamicPagesAPI, menuAPI, dynamicPageRecordsAPI, structureAPI, getImageUrl } from '@/lib/api';
import { AdminHeaderRightContext, AdminBreadcrumbContext } from '../../layout';
import { ConfirmModal } from '../../components';
import { BLOCK_TYPES, slugFromText } from '../../components/NewsBlockEditor';
import styles from '../../admin.module.css';

const TABLE_FIELD_TYPE_PRIORITY = ['image', 'heading', 'text'];
const MAX_TABLE_COLUMNS = 4;
const VISIBILITY_COLUMN_WIDTH_PX = 140;
const ACTIONS_COLUMN_WIDTH_PX = 200;
const DEFAULT_LIMIT = 10;
const ADMIN_UI_VERSION = 1;

const DEFAULT_ADMIN_UI = {
  version: ADMIN_UI_VERSION,
  actions: {
    showVisibilityToggle: true,
    showEdit: true,
    showDelete: true,
    showOpenOnSite: false,
    showBooleanInline: false,
  },
  table: {
    mode: 'auto', // auto | custom
    visibleFieldKeys: [],
    hiddenFieldKeys: [],
  },
  publicLink: {
    template: '',
  },
};

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function sanitizeAdminUiConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const actions = input.actions && typeof input.actions === 'object' ? input.actions : {};
  const table = input.table && typeof input.table === 'object' ? input.table : {};
  const publicLink = input.publicLink && typeof input.publicLink === 'object' ? input.publicLink : {};
  const mode = table.mode === 'custom' ? 'custom' : 'auto';

  return {
    version: Number(input.version) || ADMIN_UI_VERSION,
    actions: {
      showVisibilityToggle: actions.showVisibilityToggle !== false,
      showEdit: actions.showEdit !== false,
      showDelete: actions.showDelete !== false,
      showOpenOnSite: actions.showOpenOnSite === true,
      showBooleanInline: actions.showBooleanInline === true,
    },
    table: {
      mode,
      visibleFieldKeys: normalizeStringArray(table.visibleFieldKeys),
      hiddenFieldKeys: normalizeStringArray(table.hiddenFieldKeys),
    },
    publicLink: {
      template: String(publicLink.template || '').trim(),
    },
  };
}

function getBlockLabel(field) {
  if (field?.type === 'relatedEntities' && field?.relatedResourceLabel) {
    const label = String(field.relatedResourceLabel).trim();
    if (label) return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if (field.label && String(field.label).trim()) return field.label;
  return BLOCK_TYPES.find(b => b.type === field.type)?.label ?? field.type;
}

function labelToFieldKey(label) {
  if (!label || !String(label).trim()) return '';
  // В редакторе записи используется slugFromText (транслит) + '_' вместо '-'.
  // Здесь повторяем то же правило для чтения данных.
  const slug = slugFromText(label);
  if (!slug) return '';
  return slug.replace(/-/g, '_');
}

function buildStructureFields(raw) {
  const fields = (raw || [])
    .filter((f) => f?.type !== 'additionalBlocks')
    .map((f, i) => ({
      type: f.type || 'text',
      order: f.order ?? i,
      label: f.label ?? '',
      relatedResourceSlug: f.relatedResourceSlug ?? '',
      relatedResourceLabel: f.relatedResourceLabel ?? '',
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const usedKeys = new Set();
  return fields.map((f, i) => {
    let baseKey = labelToFieldKey(f.label);
    if (!baseKey) baseKey = `${f.type}-${f.order ?? i}`;
    let fieldKey = baseKey;
    let suffix = 0;
    while (usedKeys.has(fieldKey)) {
      suffix++;
      fieldKey = `${baseKey}_${suffix}`;
    }
    usedKeys.add(fieldKey);
    return { ...f, fieldKey };
  });
}

function buildVisibleTableFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return [];

  const selected = [];
  const selectedKeys = new Set();

  for (const type of TABLE_FIELD_TYPE_PRIORITY) {
    const match = fields.find((field) => field.type === type && !selectedKeys.has(field.fieldKey));
    if (match) {
      selected.push(match);
      selectedKeys.add(match.fieldKey);
    }
  }

  for (const field of fields) {
    if (selected.length >= MAX_TABLE_COLUMNS) break;
    if (selectedKeys.has(field.fieldKey)) continue;
    if (field.type === 'image' && selected.some((item) => item.type === 'image')) continue;
    selected.push(field);
    selectedKeys.add(field.fieldKey);
  }

  // Переключатели должны быть видны в таблице всегда, чтобы не заходить в карточку записи.
  for (const field of fields) {
    if (field.type !== 'boolean') continue;
    if (selectedKeys.has(field.fieldKey)) continue;
    selected.push(field);
    selectedKeys.add(field.fieldKey);
  }

  return selected;
}

function getDynamicColumnClass(field) {
  if (!field?.type) return '';
  if (field.type === 'image') return styles.dynamicImageCell;
  if (field.type === 'gallery') return styles.dynamicGalleryCell;
  if (field.type === 'heading') return `${styles.dynamicContentCell} ${styles.dynamicTitleCell}`;
  if (field.type === 'text') return `${styles.dynamicContentCell} ${styles.dynamicDescriptionCell}`;
  return styles.dynamicDefaultCell;
}

function getDynamicColumnWidth(field, visibleFields) {
  if (!Array.isArray(visibleFields) || visibleFields.length === 0) return '100%';

  const titleField = visibleFields.find((item) => item.type === 'heading');
  const imageField = visibleFields.find((item) => item.type === 'image');
  const otherFields = visibleFields.filter(
    (item) =>
      (!titleField || item.fieldKey !== titleField.fieldKey) &&
      (!imageField || item.fieldKey !== imageField.fieldKey)
  );

  if (imageField && field.fieldKey === imageField.fieldKey) {
    return '120px';
  }

  if (titleField && field.fieldKey === titleField.fieldKey) {
    return '20%';
  }

  if (otherFields.length === 0) return 'auto';

  const reservedParts = [`${VISIBILITY_COLUMN_WIDTH_PX}px`, `${ACTIONS_COLUMN_WIDTH_PX}px`];
  if (imageField) reservedParts.push('120px');
  if (titleField) reservedParts.push('20%');
  const restExpression = reservedParts.length > 0 ? `100% - ${reservedParts.join(' - ')}` : '100%';
  return `calc((${restExpression}) / ${otherFields.length})`;
}

function getRecordFieldValue(record, field) {
  return (
    record?.[field.fieldKey] ??
    record?.[`${field.type}-${field.order ?? 0}`] ??
    record?.[field.type]
  );
}

function toComparableValue(value, fieldType) {
  const normalized = normalizeFieldValueForTable(value, fieldType);

  if (fieldType === 'image') {
    if (!normalized) return '';
    if (typeof normalized === 'string') return normalized;
    return normalized?.url || normalized?.value || '';
  }

  if (fieldType === 'gallery') {
    return Array.isArray(normalized) ? normalized.length : 0;
  }

  if (fieldType === 'heading') {
    if (!normalized) return '';
    if (typeof normalized === 'object' && normalized !== null && 'text' in normalized) return String(normalized.text || '');
    return typeof normalized === 'string' ? normalized : '';
  }

  if (fieldType === 'text') {
    if (!normalized) return '';
    const text = typeof normalized === 'object' && normalized !== null && 'content' in normalized
      ? String(normalized.content || '')
      : (typeof normalized === 'string' ? normalized : '');
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (fieldType === 'boolean') {
    if (typeof normalized === 'boolean') return normalized ? 1 : 0;
    if (normalized && typeof normalized === 'object' && 'value' in normalized) {
      const inner = normalized.value;
      if (typeof inner === 'boolean') return inner ? 1 : 0;
      if (typeof inner === 'string') return inner.toLowerCase() === 'true' ? 1 : 0;
      return Number(Boolean(inner));
    }
    if (typeof normalized === 'string') return normalized.toLowerCase() === 'true' ? 1 : 0;
    return Number(Boolean(normalized));
  }

  if (normalized == null) return '';
  if (typeof normalized === 'number' || typeof normalized === 'boolean') return normalized;
  if (typeof normalized === 'string') return normalized;
  if (Array.isArray(normalized)) return normalized.length;
  return JSON.stringify(normalized);
}

function resolveBooleanCellValue(value) {
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

function extractTextValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(extractTextValue).find(Boolean) || '';
  if (typeof value === 'object') {
    if ('text' in value) return extractTextValue(value.text);
    if ('content' in value) return extractTextValue(value.content);
    if ('value' in value) return extractTextValue(value.value);
    if ('label' in value) return extractTextValue(value.label);
  }
  return '';
}

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
  } catch (_) {
    return value;
  }
}

function normalizeFieldValueForTable(value, fieldType) {
  const parsed = parseMaybeJson(value);

  if (fieldType === 'gallery') {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.images)) return parsed.images;
    return Array.isArray(value) ? value : [];
  }

  if (fieldType === 'list') {
    if (Array.isArray(parsed)) return { items: parsed };
    if (parsed && typeof parsed === 'object') return parsed;
    return value;
  }

  return parsed;
}

function formatTableCellText(value, fieldType) {
  const normalized = normalizeFieldValueForTable(value, fieldType);

  if (fieldType === 'relatedEntities') {
    const selectedItems = Array.isArray(normalized?.selectedItems) ? normalized.selectedItems : [];
    const selectedIds = Array.isArray(normalized?.selectedIds) ? normalized.selectedIds : [];
    const names = selectedItems
      .map((item) => extractTextValue(item?.label || item?.name || item?.title || item?.id))
      .filter(Boolean);
    if (names.length > 0) return names.join(', ');
    if (selectedIds.length > 0) return `${selectedIds.length} выбрано`;
    return '';
  }

  if (fieldType === 'multiselect') {
    const selectedItems = Array.isArray(normalized?.selectedItems) ? normalized.selectedItems : [];
    const values = Array.isArray(normalized?.values) ? normalized.values : (Array.isArray(normalized) ? normalized : []);
    const fromSelectedItems = selectedItems.map((item) => extractTextValue(item?.label || item?.name || item?.value || item)).filter(Boolean);
    const fromValues = values.map((item) => extractTextValue(item)).filter(Boolean);
    return [...fromSelectedItems, ...fromValues].join(', ');
  }

  if (fieldType === 'contact') {
    return extractTextValue(normalized?.value ?? normalized);
  }

  if (fieldType === 'url') {
    return extractTextValue(normalized?.value ?? normalized?.url ?? normalized);
  }

  if (fieldType === 'file' || fieldType === 'video' || fieldType === 'audio') {
    return extractTextValue(normalized?.title || normalized?.url || normalized?.value || normalized);
  }

  if (fieldType === 'list') {
    const items = Array.isArray(normalized?.items) ? normalized.items : [];
    return items.length > 0 ? items.map((item) => extractTextValue(item)).filter(Boolean).join(', ') : '';
  }

  if (fieldType === 'table') {
    const headers = Array.isArray(normalized?.headers) ? normalized.headers : [];
    const rows = Array.isArray(normalized?.rows) ? normalized.rows : [];
    if (rows.length > 0) return `${rows.length} строк`;
    if (headers.length > 0) return `${headers.length} колонок`;
    return '';
  }

  if (fieldType === 'accordion') {
    const items = Array.isArray(normalized?.items) ? normalized.items : [];
    return items.length > 0 ? `${items.length} пунктов` : '';
  }

  if (fieldType === 'tabs') {
    const tabs = Array.isArray(normalized?.tabs) ? normalized.tabs : [];
    return tabs.length > 0 ? `${tabs.length} вкладок` : '';
  }

  if (fieldType === 'json') {
    return typeof normalized?.value === 'string' ? normalized.value : extractTextValue(normalized);
  }

  if (fieldType === 'date' || fieldType === 'datetime') {
    const raw = extractTextValue(normalized?.value ?? normalized);
    if (!raw) return '';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    return fieldType === 'datetime'
      ? dt.toLocaleString('ru-RU')
      : dt.toLocaleDateString('ru-RU');
  }

  return extractTextValue(normalized);
}

function buildPublicRecordUrlByTemplate(template, record) {
  const rawTemplate = String(template || '').trim();
  if (!rawTemplate) return null;

  const normalizedTemplate = rawTemplate.startsWith('/') ? rawTemplate : `/${rawTemplate}`;
  const directSlug = String(record?.url_text || record?.slug || '').trim();
  const titleCandidates = [
    record?.nazvanie,
    record?.title,
    record?.zagolovok,
    record?.name,
  ];
  const titleValue = titleCandidates.map(extractTextValue).find((value) => value && value.trim()) || '';
  const slugValue = directSlug || slugFromText(titleValue);

  return normalizedTemplate
    .replace(/:url_text/g, slugValue || '')
    .replace(/:slug/g, slugValue || '')
    .replace(/:id/g, String(record?.id || ''))
    .replace(/\/\/+/g, '/');
}

function normalizeTemplatePath(raw) {
  const source = String(raw || '').trim();
  if (!source) return '';

  let path = source;
  try {
    if (/^https?:\/\//i.test(source)) {
      path = new URL(source).pathname || '';
    } else if (!source.startsWith('/')) {
      path = new URL(`https://${source}`).pathname || '';
    }
  } catch (_) {
    path = source;
  }

  path = String(path || '')
    .split('#')[0]
    .split('?')[0]
    .trim()
    .replace(/\/{2,}/g, '/');

  if (!path) return '';
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

function buildTemplateFromAnyPathInput(rawInput) {
  const normalizedPath = normalizeTemplatePath(rawInput);
  if (!normalizedPath) return '';

  if (/:slug|:url_text|:id/.test(normalizedPath)) {
    return normalizedPath.replace(/\/+$/, '') || '';
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.length === 0) return '';
  if (segments.length === 1) return `/${segments[0]}/:slug`;
  return `/${segments.slice(0, -1).join('/')}/:slug`;
}

function withToggledBooleanValue(currentValue, nextBool) {
  if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue) && 'value' in currentValue) {
    return { ...currentValue, value: nextBool };
  }
  return nextBool;
}

export default function DynamicPageEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageTitle, setPageTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [structureFields, setStructureFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState(null);
  const [booleanUpdatingKey, setBooleanUpdatingKey] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [publicUrlTemplate, setPublicUrlTemplate] = useState('');
  const [menuItemId, setMenuItemId] = useState(null);
  const [adminUiConfig, setAdminUiConfig] = useState(DEFAULT_ADMIN_UI);
  const [uiSettingsDraft, setUiSettingsDraft] = useState(DEFAULT_ADMIN_UI);
  const [isUiSettingsOpen, setIsUiSettingsOpen] = useState(false);
  const [isUiSettingsSaving, setIsUiSettingsSaving] = useState(false);
  const [pathAcceptMessage, setPathAcceptMessage] = useState('');
  const setHeaderRight = useContext(AdminHeaderRightContext)?.setHeaderRight;
  const setBreadcrumbLabel = useContext(AdminBreadcrumbContext)?.setBreadcrumbLabel;
  const setBreadcrumbAction = useContext(AdminBreadcrumbContext)?.setBreadcrumbAction;
  const tableFields = useMemo(() => {
    const autoFields = buildVisibleTableFields(structureFields);
    const config = sanitizeAdminUiConfig(adminUiConfig);
    const fieldsMap = new Map(structureFields.map((field) => [field.fieldKey, field]));

    const withBoolean =
      config.actions.showBooleanInline
        ? autoFields
        : autoFields.filter((field) => field.type !== 'boolean');

    if (config.table.mode !== 'custom') {
      const hidden = new Set(config.table.hiddenFieldKeys);
      return withBoolean.filter((field) => !hidden.has(field.fieldKey));
    }

    const selected = config.table.visibleFieldKeys
      .map((key) => fieldsMap.get(key))
      .filter(Boolean);

    if (config.actions.showBooleanInline) {
      const selectedKeys = new Set(selected.map((field) => field.fieldKey));
      for (const field of structureFields) {
        if (field.type !== 'boolean') continue;
        if (selectedKeys.has(field.fieldKey)) continue;
        selected.push(field);
      }
    }

    return selected.length > 0 ? selected : withBoolean;
  }, [structureFields, adminUiConfig]);
  const returnPageStorageKey = `admin_dynamic_return_page_${slug}`;

  const sortedRecords = useMemo(() => {
    if (!Array.isArray(records) || records.length === 0) return [];
    if (!sortBy) return records;

    const cloned = [...records];
    const direction = sortOrder === 'asc' ? 1 : -1;
    const sortField = tableFields.find((field) => field.fieldKey === sortBy) || null;

    cloned.sort((a, b) => {
      let aValue;
      let bValue;

      if (sortBy === '__visibility') {
        aValue = a.isPublished !== false ? 1 : 0;
        bValue = b.isPublished !== false ? 1 : 0;
      } else if (sortField) {
        aValue = toComparableValue(getRecordFieldValue(a, sortField), sortField.type);
        bValue = toComparableValue(getRecordFieldValue(b, sortField), sortField.type);
      } else {
        aValue = '';
        bValue = '';
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }

      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return (Number(aValue) - Number(bValue)) * direction;
      }

      return String(aValue).localeCompare(String(bValue), 'ru', { sensitivity: 'base', numeric: true }) * direction;
    });

    return cloned;
  }, [records, sortBy, sortOrder, tableFields]);

  const pagination = useMemo(() => {
    const total = sortedRecords.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    return { total, pages, page: currentPage };
  }, [sortedRecords.length, limit, currentPage]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return sortedRecords.slice(start, start + limit);
  }, [sortedRecords, currentPage, limit]);

  const handleSort = (fieldKey) => {
    handlePageChange(1);
    if (sortBy === fieldKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(fieldKey);
    setSortOrder('asc');
  };

  const handleResetSort = () => {
    setSortBy(null);
    setSortOrder('asc');
    handlePageChange(1);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    handlePageChange(1);
    localStorage.setItem(`admin_dynamic_limit_${slug}`, String(newLimit));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setCurrentPage(newPage);
    const newParams = new URLSearchParams(searchParams);
    if (newPage === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', String(newPage));
    }
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    if (slug === 'settings') {
      navigate('/admin/settings', { replace: true });
      return;
    }
    loadPageData();
  }, [slug, navigate]);

  useEffect(() => {
    const savedLimit = parseInt(localStorage.getItem(`admin_dynamic_limit_${slug}`) || '', 10);
    setLimit(Number.isFinite(savedLimit) && savedLimit > 0 ? savedLimit : DEFAULT_LIMIT);
    const urlPageRaw = parseInt(searchParams.get('page') || '1', 10);
    const urlPage = Number.isFinite(urlPageRaw) && urlPageRaw > 0 ? urlPageRaw : 1;
    const savedReturnPage = parseInt(localStorage.getItem(returnPageStorageKey) || '', 10);
    if (Number.isFinite(savedReturnPage) && savedReturnPage > 0) {
      setCurrentPage(savedReturnPage);
      const newParams = new URLSearchParams(searchParams);
      if (savedReturnPage === 1) {
        newParams.delete('page');
      } else {
        newParams.set('page', String(savedReturnPage));
      }
      setSearchParams(newParams, { replace: true });
      localStorage.removeItem(returnPageStorageKey);
      return;
    }
    setCurrentPage(urlPage);
  }, [slug]);

  useEffect(() => {
    const urlPageRaw = parseInt(searchParams.get('page') || '1', 10);
    const urlPage = Number.isFinite(urlPageRaw) && urlPageRaw > 0 ? urlPageRaw : 1;
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
  }, [searchParams, currentPage]);

  useEffect(() => {
    if (isLoading) return;
    if (currentPage > pagination.pages) {
      const fallbackPage = pagination.pages;
      setCurrentPage(fallbackPage);
      const newParams = new URLSearchParams(searchParams);
      if (fallbackPage === 1) {
        newParams.delete('page');
      } else {
        newParams.set('page', String(fallbackPage));
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [currentPage, pagination.pages, isLoading]);

  const loadPageData = async () => {
    setIsLoading(true);
    try {
      // Загружаем название из меню (сначала с бэка, потом из localStorage)
      let menuItems = [];
      
      try {
        const menuRes = await menuAPI.get();
        
        // Проверяем статус ответа - если 404, значит ресурс еще не сгенерирован
        if (menuRes.status === 404) {
          // Ресурс еще не сгенерирован - это нормально, продолжаем загрузку из localStorage
        } else {
          // Ресурс существует, загружаем данные
          menuItems = menuRes.data?.items || [];
          
        }
      } catch (error) {
        // Если произошла другая ошибка (не 404), тихо обрабатываем
      }
      
      // Ищем пункт меню по slug
      console.log('🔍 Ищу пункт меню для slug:', slug);
      console.log('🔍 Всего пунктов меню:', menuItems.length);
      console.log('🔍 Пункты меню:', menuItems.map(item => ({
        label: item.label,
        url: item.url,
        slug: item.url?.replace(/^\/admin\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '') || ''
      })));
      
      const menuItem = menuItems.find(item => {
        if (!item.url) return false;
        
        // Убираем префикс /admin/ и сравниваем со slug из URL
        let itemSlug = item.url.replace(/^\/admin\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '');
        const normalizedSlug = slug?.replace(/^\/+/, '').replace(/\/+$/, '') || '';
        
        const match = itemSlug === normalizedSlug || itemSlug === slug;
        if (match) {
          console.log('✅ Найден пункт меню:', item.label, 'для slug:', slug, '(itemSlug:', itemSlug, ')');
        }
        return match;
      });
      
      if (!menuItem) {
        console.warn('❌ Пункт меню не найден для slug:', slug);
        console.warn('Доступные slug из меню:', menuItems.map(item => ({
          url: item.url,
          slug: item.url?.replace(/^\/admin\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '') || ''
        })));
      }
      
      // Используем найденный пункт меню или создаем заглушку
      const title = menuItem?.label || slug.charAt(0).toUpperCase() + slug.slice(1);
      setPageTitle(title);
      setMenuItemId(menuItem?.id || null);
      const normalizedUi = sanitizeAdminUiConfig({
        ...(menuItem?.additionalBlocks?.adminUi || {}),
        publicLink: {
          ...(menuItem?.additionalBlocks?.adminUi?.publicLink || {}),
          template: String(
            menuItem?.additionalBlocks?.adminUi?.publicLink?.template
            || menuItem?.additionalBlocks?.publicUrlTemplate
            || ''
          ).trim(),
        },
      });
      setAdminUiConfig(normalizedUi);
      setUiSettingsDraft(normalizedUi);
      const templateFromMenu = String(
        normalizedUi?.publicLink?.template
        || menuItem?.publicUrlTemplate
        || menuItem?.additionalBlocks?.publicUrlTemplate
        || ''
      ).trim();
      setPublicUrlTemplate(templateFromMenu);
      
      // Загружаем структуру полей:
      // 1) основной источник — отдельный structure endpoint
      // 2) fallback — legacy структура в dynamic page
      let raw = [];
      try {
        const structureRes = await structureAPI.get(slug);
        raw = structureRes.data?.fields || [];
      } catch (error) {
        try {
          const pageRes = await dynamicPagesAPI.get(slug).catch(() => ({
            data: { structure: { fields: [] } },
          }));
          raw = pageRes.data?.structure?.fields || [];
        } catch (fallbackError) {
          console.warn('⚠️ Не удалось загрузить структуру с бэка:', fallbackError.message);
        }
      }

      const fields = buildStructureFields(raw);
      setStructureFields(fields);
      
      // Загружаем записи, если есть структура
      if (fields.length > 0) {
        try {
          const recordsRes = await dynamicPageRecordsAPI.getAll(slug, { page: 1, limit: 5000 }).catch(() => ({ data: { records: [] } }));
          setRecords(recordsRes.data?.records || []);
        } catch (error) {
          console.error('Ошибка загрузки записей:', error);
          setRecords([]);
        }
      }
      
      // Устанавливаем название в хлебные крошки
      if (setBreadcrumbLabel) {
        setBreadcrumbLabel(title);
      }
    } catch (error) {
      console.error('Ошибка загрузки страницы:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUiSettings = async () => {
    if (!menuItemId || isUiSettingsSaving) return;

    setIsUiSettingsSaving(true);
    try {
      const normalizedDraft = sanitizeAdminUiConfig(uiSettingsDraft);
      const menuRes = await menuAPI.get();
      const menuItems = Array.isArray(menuRes?.data?.items) ? menuRes.data.items : [];

      const updatedItems = menuItems.map((item) => {
        if (item.id !== menuItemId) return item;
        const existingAdditional =
          item?.additionalBlocks && typeof item.additionalBlocks === 'object' && !Array.isArray(item.additionalBlocks)
            ? item.additionalBlocks
            : {};

        return {
          ...item,
          additionalBlocks: {
            ...existingAdditional,
            publicUrlTemplate: normalizedDraft.publicLink.template || existingAdditional.publicUrlTemplate || '',
            adminUi: normalizedDraft,
          },
        };
      });

      await menuAPI.update(updatedItems);

      setAdminUiConfig(normalizedDraft);
      setPublicUrlTemplate(normalizedDraft.publicLink.template || '');
      setIsUiSettingsOpen(false);
      window.dispatchEvent(new CustomEvent('menuUpdated'));
      // После успешного сохранения перезагружаем страницу, чтобы гарантированно
      // подтянуть актуальную конфигурацию и таблицу из источника данных.
      window.location.reload();
    } catch (error) {
      console.error('Ошибка сохранения настроек интерфейса:', error);
      alert('Не удалось сохранить настройки таблицы');
    } finally {
      setIsUiSettingsSaving(false);
    }
  };

  const handleDelete = (recordId) => {
    setConfirmModal({
      open: true,
      title: 'Удалить запись?',
      message: 'Вы уверены, что хотите удалить эту запись?',
      onConfirm: async () => {
        try {
          await dynamicPageRecordsAPI.delete(slug, recordId);
          setRecords((prev) => prev.filter((r) => r.id !== recordId));
          setConfirmModal(null);
        } catch (error) {
          console.error('Ошибка удаления:', error);
          alert('Не удалось удалить запись');
        }
      },
      onCancel: () => setConfirmModal(null),
    });
  };

  const handleToggleVisibility = async (record) => {
    if (!record?.id || visibilityUpdatingId) return;

    const nextIsPublished = !(record.isPublished !== false);
    setVisibilityUpdatingId(record.id);

    try {
      await dynamicPageRecordsAPI.update(slug, record.id, {
        ...record,
        isPublished: nextIsPublished,
      });

      setRecords((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, isPublished: nextIsPublished } : item
        )
      );
    } catch (error) {
      console.error('Ошибка изменения видимости:', error);
      alert('Не удалось изменить видимость записи');
    } finally {
      setVisibilityUpdatingId(null);
    }
  };

  const handleToggleBooleanField = async (record, field) => {
    if (!record?.id || !field?.fieldKey || booleanUpdatingKey) return;

    const updateKey = `${record.id}:${field.fieldKey}`;
    const currentValue = getRecordFieldValue(record, field);
    const nextBool = !resolveBooleanCellValue(currentValue);
    const nextFieldValue = withToggledBooleanValue(currentValue, nextBool);

    setBooleanUpdatingKey(updateKey);
    try {
      await dynamicPageRecordsAPI.update(slug, record.id, {
        ...record,
        [field.fieldKey]: nextFieldValue,
      });

      setRecords((prev) =>
        prev.map((item) =>
          item.id === record.id
            ? { ...item, [field.fieldKey]: nextFieldValue }
            : item
        )
      );
    } catch (error) {
      console.error('Ошибка изменения переключателя:', error);
      alert('Не удалось изменить значение переключателя');
    } finally {
      setBooleanUpdatingKey(null);
    }
  };

  const renderSortIcon = (fieldKey) => {
    if (sortBy !== fieldKey) return <ArrowUpDown size={14} className={styles.sortIconInactive} />;
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const renderPagination = () => (
    <>
      <div className={styles.paginationLimit}>
        <label htmlFor="dynamic-limit-select">Показывать:</label>
        <select
          id="dynamic-limit-select"
          value={limit}
          onChange={(e) => handleLimitChange(parseInt(e.target.value, 10))}
          className={styles.limitSelect}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageBtn}
            aria-label="Предыдущая страница"
          >
            <ChevronLeft size={18} />
          </button>
          {(() => {
            const pages = [];
            const totalPages = pagination.pages;
            const current = currentPage;
            if (current > 3) {
              pages.push(<button key={1} onClick={() => handlePageChange(1)} className={styles.pageBtn}>1</button>);
              if (current > 4) pages.push(<span key="ellipsis1" className={styles.ellipsis}>...</span>);
            }
            const start = Math.max(1, current - 2);
            const end = Math.min(totalPages, current + 2);
            for (let i = start; i <= end; i++) {
              pages.push(
                <button key={i} onClick={() => handlePageChange(i)} className={`${styles.pageBtn} ${current === i ? styles.active : ''}`}>{i}</button>
              );
            }
            if (current < totalPages - 2) {
              if (current < totalPages - 3) pages.push(<span key="ellipsis2" className={styles.ellipsis}>...</span>);
              pages.push(<button key={totalPages} onClick={() => handlePageChange(totalPages)} className={styles.pageBtn}>{totalPages}</button>);
            }
            return pages;
          })()}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.pages}
            className={styles.pageBtn}
            aria-label="Следующая страница"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </>
  );

  // Устанавливаем кнопку "Добавить" в header
  useEffect(() => {
    if (!setHeaderRight || !structureFields.length) {
      if (setHeaderRight) setHeaderRight(null);
      return;
    }
    
    setHeaderRight(
      <button
        type="button"
        className={styles.addBtn}
        onClick={() => {
          localStorage.setItem(returnPageStorageKey, String(currentPage));
          navigate(`/admin/dynamic/${slug}/new`);
        }}
      >
        <Plus size={18} /> Добавить
      </button>
    );
    
    return () => setHeaderRight(null);
  }, [setHeaderRight, structureFields.length, slug, navigate, currentPage, returnPageStorageKey]);

  useEffect(() => {
    if (!setBreadcrumbAction || !structureFields.length) {
      if (setBreadcrumbAction) setBreadcrumbAction(null);
      return;
    }

    setBreadcrumbAction(
      <button
        type="button"
        className={styles.breadcrumbHelpBtn}
        onClick={() => {
          setUiSettingsDraft(sanitizeAdminUiConfig(adminUiConfig));
          setPathAcceptMessage('');
          setIsUiSettingsOpen(true);
        }}
        title="Настройки раздела"
        aria-label="Настройки раздела"
      >
        <Settings size={16} />
      </button>
    );

    return () => setBreadcrumbAction(null);
  }, [setBreadcrumbAction, structureFields.length, adminUiConfig]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  // Если структура не настроена
  if (structureFields.length === 0) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.emptyState}>
          <h3>Структура не настроена</h3>
          <p>Перейдите в настройки и настройте структуру полей для этого раздела.</p>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => navigate('/admin/settings')}
          >
            Перейти в настройки
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.tableWrapper}>
        <div className={`${styles.tableContainer} ${styles.dynamicTableContainer}`}>
          {records.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>Записей пока нет</h3>
              <p>Добавьте первую запись</p>
            </div>
          ) : (
            <table className={`${styles.table} ${styles.dynamicTable}`}>
              <colgroup>
                {tableFields.map((field) => (
                  <col key={`col-${field.fieldKey}`} style={{ width: getDynamicColumnWidth(field, tableFields) }} />
                ))}
                <col style={{ width: `${VISIBILITY_COLUMN_WIDTH_PX}px` }} />
                <col style={{ width: `${ACTIONS_COLUMN_WIDTH_PX}px` }} />
              </colgroup>
              <thead>
                <tr>
                  {tableFields.map((field) => (
                    <th
                      key={field.fieldKey}
                      className={`${getDynamicColumnClass(field)} ${styles.sortableHeader}`}
                      onClick={() => handleSort(field.fieldKey)}
                    >
                      <span className={styles.sortHeaderInner}>
                        <span>{getBlockLabel(field)}</span>
                        {renderSortIcon(field.fieldKey)}
                      </span>
                    </th>
                  ))}
                  <th className={`${styles.dynamicVisibilityCell} ${styles.sortableHeader}`} onClick={() => handleSort('__visibility')}>
                    <span className={styles.sortHeaderInner}>
                      <span>Видимость</span>
                      {renderSortIcon('__visibility')}
                    </span>
                  </th>
                  <th className={`${styles.actionsCell} ${styles.dynamicActionsCell}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Действия</span>
                      {sortBy && (
                        <button
                          type="button"
                          onClick={handleResetSort}
                          className={styles.resetSortIconBtn}
                          title="Сбросить сортировку"
                          aria-label="Сбросить сортировку"
                        >
                          <RotateCcw size={14} className={styles.sortIconInactive} />
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => (
                  <tr key={record.id}>
                    {tableFields.map((field) => {
                      const rawVal = getRecordFieldValue(record, field);
                      const val = normalizeFieldValueForTable(rawVal, field.type);
                      const isImage = field.type === 'image' && Boolean(val);
                      const isGallery = field.type === 'gallery' && Array.isArray(val);
                      const isHeading = field.type === 'heading';
                      const isText = field.type === 'text';
                      const isBoolean = field.type === 'boolean';
                      
                      // Для heading: объект {text: "..."} или строка
                      const headingText = isHeading && val
                        ? (typeof val === 'object' && val !== null && 'text' in val ? val.text : (typeof val === 'string' ? val : null))
                        : null;
                      
                      // Для text: объект {content: "<p>...</p>"} или строка
                      const richTextContent = isText && val
                        ? (typeof val === 'object' && val !== null && 'content' in val ? val.content : (typeof val === 'string' ? val : null))
                        : null;
                      const plainRichText = typeof richTextContent === 'string'
                        ? richTextContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                        : null;
                      
                      // Для image: строка URL или объект {url, value, ...}
                      const imageUrl = isImage && val
                        ? (typeof val === 'string' ? getImageUrl(val) : (val?.url ? getImageUrl(val.url) : (val?.value ? getImageUrl(val.value) : null)))
                        : null;
                      const booleanValue = isBoolean ? resolveBooleanCellValue(val) : false;
                      const formattedTextValue = formatTableCellText(val, field.type);
                      
                      return (
                        <td key={field.fieldKey} className={getDynamicColumnClass(field)}>
                          <div className={styles.cellInner}>
                            {isImage && imageUrl ? (
                              <img
                                src={imageUrl}
                                alt=""
                                className={styles.tableImage}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling && (e.target.nextSibling.textContent = 'Ошибка загрузки');
                                }}
                              />
                            ) : isGallery ? (
                              `${val.length} фото`
                            ) : headingText ? (
                              <span className={styles.dynamicTextClamp}>{headingText || '-'}</span>
                            ) : isBoolean ? (
                              <label className={styles.tableBooleanToggle}>
                                <input
                                  type="checkbox"
                                  checked={booleanValue}
                                  onChange={() => handleToggleBooleanField(record, field)}
                                  disabled={booleanUpdatingKey === `${record.id}:${field.fieldKey}`}
                                />
                                <span className={styles.tableBooleanSwitch}></span>
                                <span className={styles.tableBooleanLabel}>
                                  {booleanValue ? 'Да' : 'Нет'}
                                </span>
                              </label>
                            ) : plainRichText ? (
                              <span className={styles.dynamicTextClamp}>
                                {(plainRichText.length > 120 ? `${plainRichText.slice(0, 120)}…` : plainRichText) || '-'}
                              </span>
                            ) : (
                              <span className={styles.dynamicTextClamp}>
                                {formattedTextValue
                                  ? (formattedTextValue.length > 120 ? `${formattedTextValue.slice(0, 120)}…` : formattedTextValue)
                                  : '-'}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className={styles.dynamicVisibilityCell}>
                      <div className={styles.cellInner}>
                        <span className={`${styles.badge} ${styles[record.isPublished !== false ? 'active' : 'inactive']}`}>
                          {record.isPublished !== false ? 'Включено' : 'Скрыто'}
                        </span>
                      </div>
                    </td>
                    <td className={`${styles.actionsCell} ${styles.dynamicActionsCell}`}>
                      <div className={styles.cellInner}>
                        <div className={styles.actions}>
                          {sanitizeAdminUiConfig(adminUiConfig).actions.showVisibilityToggle && (
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(record)}
                              className={record.isPublished !== false ? styles.deleteBtn : styles.viewBtn}
                              title={record.isPublished !== false ? 'Скрыть на сайте' : 'Показать на сайте'}
                              disabled={visibilityUpdatingId === record.id}
                            >
                              {record.isPublished !== false ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                          {sanitizeAdminUiConfig(adminUiConfig).actions.showEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.setItem(returnPageStorageKey, String(currentPage));
                                navigate(`/admin/dynamic/${slug}/${record.id}`);
                              }}
                              className={styles.editBtn}
                              title="Редактировать"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {sanitizeAdminUiConfig(adminUiConfig).actions.showOpenOnSite && (() => {
                            const publicUrl = buildPublicRecordUrlByTemplate(publicUrlTemplate, record);
                            const isPublished = record.isPublished !== false;
                            const canOpenPublic = Boolean(publicUrl) && isPublished;

                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!canOpenPublic) return;
                                  window.open(publicUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className={`${styles.viewBtn} ${!canOpenPublic ? styles.siteOpenBtnDisabled : ''}`}
                                title={
                                  !publicUrl
                                    ? 'Ссылка на сайт не настроена'
                                    : (canOpenPublic ? 'Открыть на сайте' : 'Доступно только для опубликованных записей')
                                }
                                disabled={!canOpenPublic}
                              >
                                <ExternalLink size={16} className={!canOpenPublic ? styles.siteOpenIconDisabled : ''} />
                              </button>
                            );
                          })()}
                          {sanitizeAdminUiConfig(adminUiConfig).actions.showDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(record.id)}
                              className={styles.deleteBtn}
                              title="Удалить"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(pagination.pages > 1 || pagination.total > 0) && (
        <div className={styles.paginationFooter}>
          {renderPagination()}
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          open={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          overlayStyle={{ zIndex: 13000 }}
        />
      )}

      {isUiSettingsOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && !isUiSettingsSaving && setIsUiSettingsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Настройки таблицы"
        >
          <div className={styles.modalDialog} style={{ maxWidth: 760 }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Настройки раздела</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => !isUiSettingsSaving && setIsUiSettingsOpen(false)}
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: 'grid', gap: 12 }}>
                <label className={styles.visibilityToggle} style={{ justifyContent: 'space-between' }}>
                  <span className={styles.visibilityLabel}>Показывать «Видимость»</span>
                  <input
                    type="checkbox"
                    checked={uiSettingsDraft.actions.showVisibilityToggle !== false}
                    onChange={(e) =>
                      setUiSettingsDraft((prev) => ({
                        ...prev,
                        actions: { ...prev.actions, showVisibilityToggle: e.target.checked },
                      }))
                    }
                  />
                  <span className={styles.visibilitySwitch} />
                </label>
                <label className={styles.visibilityToggle} style={{ justifyContent: 'space-between' }}>
                  <span className={styles.visibilityLabel}>Показывать «Редактировать»</span>
                  <input
                    type="checkbox"
                    checked={uiSettingsDraft.actions.showEdit !== false}
                    onChange={(e) =>
                      setUiSettingsDraft((prev) => ({
                        ...prev,
                        actions: { ...prev.actions, showEdit: e.target.checked },
                      }))
                    }
                  />
                  <span className={styles.visibilitySwitch} />
                </label>
                <label className={styles.visibilityToggle} style={{ justifyContent: 'space-between' }}>
                  <span className={styles.visibilityLabel}>Показывать «Удалить»</span>
                  <input
                    type="checkbox"
                    checked={uiSettingsDraft.actions.showDelete !== false}
                    onChange={(e) =>
                      setUiSettingsDraft((prev) => ({
                        ...prev,
                        actions: { ...prev.actions, showDelete: e.target.checked },
                      }))
                    }
                  />
                  <span className={styles.visibilitySwitch} />
                </label>
                <label className={styles.visibilityToggle} style={{ justifyContent: 'space-between' }}>
                  <span className={styles.visibilityLabel}>Показывать «Открыть на сайте»</span>
                  <input
                    type="checkbox"
                    checked={uiSettingsDraft.actions.showOpenOnSite !== false}
                    onChange={(e) =>
                      setUiSettingsDraft((prev) => {
                        const next = {
                          ...prev,
                          actions: { ...prev.actions, showOpenOnSite: e.target.checked },
                        };
                        if (e.target.checked && !String(next.publicLink?.template || '').trim()) {
                          setPathAcceptMessage('Вставьте путь до любой записи. После распознавания появится "Путь принят."');
                        } else {
                          setPathAcceptMessage('');
                        }
                        return next;
                      })
                    }
                  />
                  <span className={styles.visibilitySwitch} />
                </label>
                {uiSettingsDraft.actions.showOpenOnSite && (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 6 }}>
                      Путь до страницы записи
                    </div>
                    <input
                      type="text"
                      value={uiSettingsDraft.publicLink?.template || ''}
                      onChange={(e) => {
                        const parsedTemplate = buildTemplateFromAnyPathInput(e.target.value);
                        setUiSettingsDraft((prev) => ({
                          ...prev,
                          publicLink: { ...(prev.publicLink || {}), template: parsedTemplate },
                        }));
                        setPathAcceptMessage(parsedTemplate ? 'Путь принят.' : 'Не удалось распознать путь.');
                      }}
                      className={styles.formInput}
                      placeholder="Вставьте URL записи, например: https://site.ru/cases/my-case"
                      autoComplete="off"
                    />
                    <div
                      style={{
                        fontSize: '0.78rem',
                        marginTop: 6,
                        color: pathAcceptMessage === 'Путь принят.' ? '#16a34a' : '#64748b',
                      }}
                    >
                      {pathAcceptMessage || 'Система автоматически сохранит шаблон вида /раздел/:slug'}
                    </div>
                  </div>
                )}
                <label className={styles.visibilityToggle} style={{ justifyContent: 'space-between' }}>
                  <span className={styles.visibilityLabel}>Показывать boolean как переключатели в таблице</span>
                  <input
                    type="checkbox"
                    checked={uiSettingsDraft.actions.showBooleanInline !== false}
                    onChange={(e) =>
                      setUiSettingsDraft((prev) => ({
                        ...prev,
                        actions: { ...prev.actions, showBooleanInline: e.target.checked },
                      }))
                    }
                  />
                  <span className={styles.visibilitySwitch} />
                </label>

                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 6 }}>Режим колонок таблицы</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`${styles.docsTabBtn} ${uiSettingsDraft.table?.mode !== 'custom' ? styles.docsTabBtnActive : ''}`}
                      onClick={() =>
                        setUiSettingsDraft((prev) => ({
                          ...prev,
                          table: { ...(prev.table || {}), mode: 'auto' },
                        }))
                      }
                      aria-pressed={uiSettingsDraft.table?.mode !== 'custom'}
                    >
                      Авто
                    </button>
                    <button
                      type="button"
                      className={`${styles.docsTabBtn} ${uiSettingsDraft.table?.mode === 'custom' ? styles.docsTabBtnActive : ''}`}
                      onClick={() =>
                        setUiSettingsDraft((prev) => ({
                          ...prev,
                          table: {
                            ...(prev.table || {}),
                            mode: 'custom',
                            // Подхватываем текущее отображение таблицы,
                            // чтобы ручной режим стартовал с понятного состояния.
                            visibleFieldKeys: tableFields.map((field) => field.fieldKey),
                          },
                        }))
                      }
                      aria-pressed={uiSettingsDraft.table?.mode === 'custom'}
                    >
                      Ручной выбор
                    </button>
                  </div>
                </div>

                {uiSettingsDraft.table?.mode === 'custom' && (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8 }}>
                      Какие поля показывать в таблице (включены текущие)
                    </div>
                    <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
                      {structureFields.map((field) => {
                        const selected = (uiSettingsDraft.table?.visibleFieldKeys || []).includes(field.fieldKey);
                        const currentlyShown = tableFields.some((item) => item.fieldKey === field.fieldKey);
                        return (
                          <label key={field.fieldKey} className={styles.visibilityToggle} style={{ justifyContent: 'space-between' }}>
                            <span className={styles.visibilityLabel}>
                              {getBlockLabel(field)} ({field.type}){currentlyShown ? ' - сейчас в таблице' : ''}
                            </span>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                setUiSettingsDraft((prev) => {
                                  const prevKeys = normalizeStringArray(prev.table?.visibleFieldKeys);
                                  const nextKeys = e.target.checked
                                    ? [...prevKeys, field.fieldKey]
                                    : prevKeys.filter((key) => key !== field.fieldKey);
                                  return {
                                    ...prev,
                                    table: {
                                      ...(prev.table || {}),
                                      mode: 'custom',
                                      visibleFieldKeys: nextKeys,
                                    },
                                  };
                                });
                              }}
                            />
                            <span className={styles.visibilitySwitch} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setIsUiSettingsOpen(false)}
                disabled={isUiSettingsSaving}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => {
                  setConfirmModal({
                    open: true,
                    title: 'Сохранить настройки раздела?',
                    message: 'Изменения будут применены к таблице и действиям. Продолжить?',
                    onConfirm: async () => {
                      setConfirmModal(null);
                      await saveUiSettings();
                    },
                    onCancel: () => setConfirmModal(null),
                  });
                }}
                disabled={isUiSettingsSaving || !menuItemId}
              >
                {isUiSettingsSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
