import { useState, useEffect } from 'react';
import { publicFiltrsaytaAPI, publicTagsAPI } from '@/lib/api';
import { DEFAULT_FILTER_CATEGORIES, buildFilterCategoriesFromRecords } from '@/data/casesData';

/**
 * Загружает категории фильтра с бэка: записи из /filtrsayta и теги из /tags/public.
 * В записях tegi — строка JSON (объект с массивом id тегов); подставляем названия тегов по id.
 */
export function useSiteFilterCategories() {
  const [filterCategories, setFilterCategories] = useState(DEFAULT_FILTER_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      publicFiltrsaytaAPI.getAll({ page: 1, limit: 100 }),
      publicTagsAPI.getAll({ page: 1, limit: 500 }),
    ])
      .then(([filtrRes, tagsRes]) => {
        if (cancelled) return;
        const records = Array.isArray(filtrRes.data?.records) ? filtrRes.data.records : [];
        const tagsList = Array.isArray(tagsRes.data?.tags) ? tagsRes.data.tags : [];
        const tagsById = new Map();
        tagsList.forEach((tag) => {
          const id = tag?.id ?? tag?._id?.$oid ?? tag?._id;
          if (id == null) return;
          const name = String(tag?.nazvanie ?? tag?.name ?? tag?.label ?? tag?.title ?? '').trim();
          if (name) tagsById.set(String(id), name);
        });
        const built = buildFilterCategoriesFromRecords(records, tagsById);
        setFilterCategories(built ?? DEFAULT_FILTER_CATEGORIES);
      })
      .catch(() => {
        if (!cancelled) setFilterCategories(DEFAULT_FILTER_CATEGORIES);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { filterCategories, filterLoading: loading };
}
