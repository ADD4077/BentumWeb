import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

const PAGE_SIZE = 6;

export const useLiterature = (activeTab, searchQuery, externalState = {}) => {
  const [literatureItems, setLiteratureItems] = useState([]);
  const [literatureTotal, setLiteratureTotal] = useState(0);
  const [literaturePage, setLiteraturePage] = useState(1);
  const [literatureLoading, setLiteratureLoading] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  // Используем внешнее состояние если передано (из ModalContext), иначе локальное
  const [internalSelectedCategories, setInternalSelectedCategories] = useState(['all']);
  const [internalSortBy, setInternalSortBy] = useState('default');
  
  const selectedCategories = externalState.selectedCategories ?? internalSelectedCategories;
  const setSelectedCategories = externalState.setSelectedCategories ?? setInternalSelectedCategories;
  const sortBy = externalState.sortBy ?? internalSortBy;
  const setSortBy = externalState.setSortBy ?? setInternalSortBy;

  const literatureMaxPage = useMemo(() =>
    Math.max(1, Math.ceil(literatureTotal / PAGE_SIZE)),
    [literatureTotal]
  );

  const fetchLiterature = useCallback(async (page = 1) => {
    setLiteratureLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', PAGE_SIZE);
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
        selectedCategories.forEach(cat => params.append('category', cat));
      }
      if (sortBy !== 'default') {
        params.set('sort', sortBy);
      }

      const res = await fetch(`${API_ENDPOINTS.LITERATURE}?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка запроса литературы');

      const data = await res.json();
      setLiteratureItems(data.items || []);
      setLiteratureTotal(data.total || 0);
      setLiteraturePage(data.page || page);
    } catch (e) {
      console.error('Literature fetch error:', e);
      setLiteratureItems([]);
      setLiteratureTotal(0);
    } finally {
      setLiteratureLoading(false);
    }
  }, [searchQuery, selectedCategories, sortBy]);

  // Загрузка при смене страницы/фильтров
  useEffect(() => {
    if (activeTab === 'literature') {
      fetchLiterature(literaturePage);
    }
  }, [activeTab, literaturePage, fetchLiterature]);

  // Сброс на первую страницу при смене поиска/категории
  useEffect(() => {
    if (activeTab === 'literature') {
      setLiteraturePage(1);
      fetchLiterature(1);
    }
  }, [activeTab, searchQuery, selectedCategories, sortBy, fetchLiterature]);

  const categories = useMemo(() => [
    { id: 'all', name: 'Все' },
    { id: 'Информатика и вычислительная техника', name: 'ИВТ' },
    { id: 'Искусственный интеллект и машинное обучение', name: 'AI/ML' },
    { id: 'Программная инженерия', name: 'Программная инженерия' },
    { id: 'Информационная безопасность', name: 'ИБ' },
    { id: 'Системный анализ и управление', name: 'САУ' },
    { id: 'Информационные системы и технологии', name: 'ИСиТ' },
    { id: 'Прикладная информатика', name: 'Прикладная информатика' },
    { id: 'Программное обеспечение информационных систем и технологий', name: 'Программное обеспечение' }
  ], []);

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
    fetchLiterature
  };
};

export default useLiterature;
