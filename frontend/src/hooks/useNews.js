import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

const PAGE_SIZE = 6;
const NEWS_CACHE_TTL_MS = 30_000;

const NEWS_CATEGORY_TO_BACKEND = {
  all: 'all',
  study: 'education',
  science: 'academic',
  events: 'events',
  achievements: 'achievements',
  career: 'academic',
  sports: 'sports',
};

const newsResponseCache = new Map();
const newsInflightRequests = new Map();

function getNewsCacheKey(page, search, sortBy, category) {
  return JSON.stringify([page, search, sortBy, category]);
}

function readCachedNews(key) {
  const cached = newsResponseCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.createdAt > NEWS_CACHE_TTL_MS) {
    newsResponseCache.delete(key);
    return null;
  }

  return cached.data;
}

export const useNews = (activeTab, externalState = {}) => {
  const [newsData, setNewsData] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [newsPage, setNewsPage] = useState(1);
  const [newsTotal, setNewsTotal] = useState(0);
  const [selectedNewsCategory, setSelectedNewsCategory] = useState('all');
  const [internalNewsSortBy, setInternalNewsSortBy] = useState('date_desc');
  const previousFiltersRef = useRef(null);

  const newsSortBy = externalState.sortBy ?? internalNewsSortBy;
  const setNewsSortBy = externalState.setSortBy ?? setInternalNewsSortBy;

  const newsMaxPage = useMemo(
    () => Math.max(1, Math.ceil(newsTotal / PAGE_SIZE)),
    [newsTotal]
  );

  const loadNews = useCallback(async (page = 1, search = '', sortBy = 'date_desc', category = 'all') => {
    const cacheKey = getNewsCacheKey(page, search, sortBy, category);
    const cached = readCachedNews(cacheKey);

    if (cached) {
      setNewsData(cached.items || []);
      setNewsTotal(cached.total || 0);
      setNewsPage(cached.page || page);
      return;
    }

    setNewsLoading(true);
    try {
      const backendCategory = NEWS_CATEGORY_TO_BACKEND[category] || 'all';
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', PAGE_SIZE);
      if (search) params.set('search', search);
      if (sortBy !== 'date_desc') params.set('sort_by', sortBy);
      if (backendCategory !== 'all') params.set('category', backendCategory);

      let request = newsInflightRequests.get(cacheKey);
      if (!request) {
        request = fetch(`${API_ENDPOINTS.NEWS}?${params.toString()}`, {
          credentials: 'include',
        }).then((response) => response.json());
        newsInflightRequests.set(cacheKey, request);
      }

      const data = await request;

      if (data.success) {
        newsResponseCache.set(cacheKey, {
          data,
          createdAt: Date.now(),
        });
        setNewsData(data.items || []);
        setNewsTotal(data.total || 0);
        setNewsPage(data.page || page);
      }
    } catch (error) {
      console.error('News load error:', error);
    } finally {
      newsInflightRequests.delete(cacheKey);
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'news') {
      return;
    }

    const filtersSignature = JSON.stringify([
      newsSearchQuery,
      newsSortBy,
      selectedNewsCategory,
    ]);

    if (previousFiltersRef.current !== filtersSignature) {
      previousFiltersRef.current = filtersSignature;

      if (newsPage !== 1) {
        setNewsPage(1);
        return;
      }
    }

    loadNews(newsPage, newsSearchQuery, newsSortBy, selectedNewsCategory);
  }, [activeTab, newsPage, newsSearchQuery, newsSortBy, selectedNewsCategory, loadNews]);

  const newsCategories = useMemo(() => [
    { id: 'all', name: 'Все' },
    { id: 'study', name: 'Учёба' },
    { id: 'science', name: 'Наука' },
    { id: 'events', name: 'События' },
    { id: 'achievements', name: 'Достижения' },
    { id: 'career', name: 'Карьера' },
    { id: 'sports', name: 'Спорт' },
  ], []);

  return {
    newsData,
    filteredNews: newsData,
    newsLoading,
    newsSearchQuery,
    setNewsSearchQuery,
    newsSortBy,
    setNewsSortBy,
    newsPage,
    setNewsPage,
    newsTotal,
    newsMaxPage,
    selectedNewsCategory,
    setSelectedNewsCategory,
    newsCategories,
    loadNews,
  };
};

export default useNews;
