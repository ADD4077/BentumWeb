import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

const PAGE_SIZE = 6;

export const useNews = (activeTab) => {
  const [newsData, setNewsData] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [newsSortBy, setNewsSortBy] = useState('date_desc');
  const [newsPage, setNewsPage] = useState(1);
  const [newsTotal, setNewsTotal] = useState(0);
  const [selectedNewsCategory, setSelectedNewsCategory] = useState('all');

  const newsMaxPage = useMemo(() =>
    Math.max(1, Math.ceil(newsTotal / PAGE_SIZE)),
    [newsTotal]
  );

  const loadNews = useCallback(async (page = 1, search = '', sortBy = 'date_desc', category = 'all') => {
    setNewsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', PAGE_SIZE);
      if (search) params.set('search', search);
      if (sortBy !== 'date_desc') params.set('sort', sortBy);
      if (category !== 'all') params.set('category', category);

      const response = await fetch(`${API_ENDPOINTS.NEWS}?${params.toString()}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setNewsData(data.items || []);
        setNewsTotal(data.total || 0);
        setNewsPage(data.page || page);
      }
    } catch (error) {
      console.error('News load error:', error);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  // Загрузка при смене страницы/фильтров
  useEffect(() => {
    if (activeTab === 'news') {
      loadNews(newsPage, newsSearchQuery, newsSortBy, selectedNewsCategory);
    }
  }, [activeTab, newsPage, newsSearchQuery, newsSortBy, selectedNewsCategory, loadNews]);

  // Сброс на первую страницу при смене поиска/сортировки/категории
  useEffect(() => {
    if (activeTab === 'news') {
      setNewsPage(1);
      loadNews(1, newsSearchQuery, newsSortBy, selectedNewsCategory);
    }
  }, [activeTab, newsSearchQuery, newsSortBy, selectedNewsCategory, loadNews]);

  const newsCategories = useMemo(() => [
    { id: 'all', name: 'Все' },
    { id: 'study', name: 'Учёба' },
    { id: 'science', name: 'Наука' },
    { id: 'events', name: 'События' },
    { id: 'achievements', name: 'Достижения' },
    { id: 'career', name: 'Карьера' },
    { id: 'sports', name: 'Спорт' }
  ], []);

  // Фильтрация на фронтенде не нужна - делается на бэкенде
  const filteredNews = newsData;

  return {
    newsData,
    filteredNews,
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
    loadNews
  };
};

export default useNews;
