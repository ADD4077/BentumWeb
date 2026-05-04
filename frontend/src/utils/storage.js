/**
 * Безопасные утилиты для работы с localStorage
 */
import { safeLogWarning } from './logger.js';

/**
 * Безопасно сохраняет данные в localStorage
 * @param {string} key - ключ
 * @param {any} value - значение для сохранения
 * @returns {boolean} успешно ли сохранено
 */
export const safeSetItem = (key, value) => {
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
      return true;
    }
    
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    safeLogWarning(`Ошибка сохранения в localStorage (${key}):`, error);
    return false;
  }
};

/**
 * Безопасно получает данные из localStorage
 * @param {string} key - ключ
 * @param {any} defaultValue - значение по умолчанию
 * @returns {any} сохраненное значение или defaultValue
 */
export const safeGetItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    
    return JSON.parse(item);
  } catch (error) {
    safeLogWarning(`Ошибка чтения из localStorage (${key}):`, error);
    // Очищаем некорректные данные
    try {
      localStorage.removeItem(key);
    } catch (cleanupError) {
      safeLogWarning(`Ошибка очистки localStorage (${key}):`, cleanupError);
    }
    return defaultValue;
  }
};

/**
 * Безопасно удаляет данные из localStorage
 * @param {string} key - ключ
 * @returns {boolean} успешно ли удалено
 */
export const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    safeLogWarning(`Ошибка удаления из localStorage (${key}):`, error);
    return false;
  }
};

/**
 * Очищает все данные приложения из localStorage
 * @returns {boolean} успешно ли очищено
 */
export const clearAuthStorage = () => {
  const keysToRemove = [
    'token',
    'banEndDate',
    'admin_users',
  ];
  
  let success = true;
  keysToRemove.forEach(key => {
    if (!safeRemoveItem(key)) {
      success = false;
    }
  });
  
  return success;
};

/**
 * Очищает все данные приложения из localStorage
 * @returns {boolean} успешно ли очищено
 */
export const clearAppStorage = () => {
  clearAuthStorage();

  const keysToRemove = [
    'openProfileModal',
    'admin_users',
    'darkMode'
  ];
  
  let success = true;
  keysToRemove.forEach(key => {
    if (!safeRemoveItem(key)) {
      success = false;
    }
  });
  
  return success;
};

/**
 * Кэш в памяти для уменьшения обращений к localStorage
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 60000; // 1 минута
  }
  
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }
  
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }
  
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

export const memoryCache = new MemoryCache();

/**
 * Получает данные с кэшированием
 * @param {string} key - ключ
 * @param {any} defaultValue - значение по умолчанию
 * @param {number} ttl - время жизни кэша
 * @returns {any} данные из кэша или localStorage
 */
export const getCachedItem = (key, defaultValue = null, ttl = 60000) => {
  // Сначала пробуем получить из кэша памяти
  const cachedValue = memoryCache.get(key);
  if (cachedValue !== null) {
    return cachedValue;
  }
  
  // Если в кэше нет, получаем из localStorage
  const value = safeGetItem(key, defaultValue);
  memoryCache.set(key, value, ttl);
  
  return value;
};

/**
 * Сохраняет данные с обновлением кэша
 * @param {string} key - ключ
 * @param {any} value - значение
 * @returns {boolean} успешно ли сохранено
 */
export const setCachedItem = (key, value) => {
  const success = safeSetItem(key, value);
  if (success) {
    memoryCache.set(key, value);
  }
  return success;
};
