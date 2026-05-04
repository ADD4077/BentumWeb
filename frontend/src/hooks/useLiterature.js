import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

const PAGE_SIZE = 6;
const LITERATURE_CACHE_TTL_MS = 30_000;

const literatureResponseCache = new Map();
const literatureInflightRequests = new Map();

function getLiteratureCacheKey(page, search, selectedCategories, sortBy) {
  return JSON.stringify([page, search, [...selectedCategories].sort(), sortBy]);
}

function readCachedLiterature(key) {
  const cached = literatureResponseCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.createdAt > LITERATURE_CACHE_TTL_MS) {
    literatureResponseCache.delete(key);
    return null;
  }

  return cached.data;
}

export const useLiterature = (activeTab, searchQuery, externalState = {}) => {
  const [literatureItems, setLiteratureItems] = useState([]);
  const [literatureTotal, setLiteratureTotal] = useState(0);
  const [literaturePage, setLiteraturePage] = useState(1);
  const [literatureLoading, setLiteratureLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [internalSelectedCategories, setInternalSelectedCategories] = useState(['all']);
  const [internalSortBy, setInternalSortBy] = useState('default');
  const previousFiltersRef = useRef(null);

  const selectedCategories = externalState.selectedCategories ?? internalSelectedCategories;
  const setSelectedCategories = externalState.setSelectedCategories ?? setInternalSelectedCategories;
  const sortBy = externalState.sortBy ?? internalSortBy;
  const setSortBy = externalState.setSortBy ?? setInternalSortBy;

  const literatureMaxPage = useMemo(
    () => Math.max(1, Math.ceil(literatureTotal / PAGE_SIZE)),
    [literatureTotal],
  );

  const fetchLiterature = useCallback(async (page = 1) => {
    const cacheKey = getLiteratureCacheKey(page, searchQuery, selectedCategories, sortBy);
    const cached = readCachedLiterature(cacheKey);

    if (cached) {
      setLiteratureItems(cached.items || []);
      setLiteratureTotal(cached.total || 0);
      setLiteraturePage(cached.page || page);
      setCategoryOptions(cached.category_options || []);
      return;
    }

    setLiteratureLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', PAGE_SIZE);
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
        selectedCategories.forEach((category) => params.append('category', category));
      }
      if (sortBy !== 'default') {
        params.set('sort', sortBy);
      }

      let request = literatureInflightRequests.get(cacheKey);
      if (!request) {
        request = fetch(`${API_ENDPOINTS.LITERATURE}?${params.toString()}`).then((response) => response.json());
        literatureInflightRequests.set(cacheKey, request);
      }

      const data = await request;
      literatureResponseCache.set(cacheKey, {
        data,
        createdAt: Date.now(),
      });
      setLiteratureItems(data.items || []);
      setLiteratureTotal(data.total || 0);
      setLiteraturePage(data.page || page);
      setCategoryOptions(data.category_options || []);
    } catch (error) {
      console.error('Literature fetch error:', error);
      setLiteratureItems([]);
      setLiteratureTotal(0);
      setCategoryOptions([]);
    } finally {
      literatureInflightRequests.delete(cacheKey);
      setLiteratureLoading(false);
    }
  }, [searchQuery, selectedCategories, sortBy]);

  useEffect(() => {
    if (activeTab !== 'literature') {
      return;
    }

    const filtersSignature = JSON.stringify([
      searchQuery,
      [...selectedCategories].sort(),
      sortBy,
    ]);

    if (previousFiltersRef.current !== filtersSignature) {
      previousFiltersRef.current = filtersSignature;

      if (literaturePage !== 1) {
        setLiteraturePage(1);
        return;
      }
    }

    fetchLiterature(literaturePage);
  }, [activeTab, searchQuery, selectedCategories, sortBy, literaturePage, fetchLiterature]);

  const categories = useMemo(
    () => [
      { id: 'all', name: 'Все', count: literatureTotal },
      ...categoryOptions,
    ],
    [categoryOptions, literatureTotal],
  );

  return {
    literatureItems,
    literatureTotal,
    literaturePage,
    setLiteraturePage,
    literatureMaxPage,
    literatureLoading,
    categorySearchQuery,
    setCategorySearchQuery,
    selectedCategories,
    setSelectedCategories,
    sortBy,
    setSortBy,
    categories,
    fetchLiterature,
  };
};

export default useLiterature;
