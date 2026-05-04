import React from 'react';
import titleLogo from '../assets/logo/title_logo.png';
import teamLeadImage from '../assets/team/teamlead.png';

/**
 * Утилиты для оптимизации bundle и производительности
 */

/**
 * Динамический импорт компонентов для code splitting
 */
export const lazyLoad = (importFunc, _fallback = null) => React.lazy(importFunc);

/**
 * Предзагрузка критичных компонентов
 */
export const preloadComponent = (importFunc) => {
  importFunc();
};

/**
 * Оптимизированные импорты для иконок (tree shaking)
 */
export const dynamicIconImport = (iconName) => import('lucide-react').then((icons) => icons[iconName]);

/**
 * Кэширование компонентов в памяти
 */
class ComponentCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 50;
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, component) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, component);
  }

  clear() {
    this.cache.clear();
  }
}

export const componentCache = new ComponentCache();

/**
 * Оптимизация изображений - выбор правильного формата
 */
export const getOptimizedImageUrl = (baseUrl, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = 'auto',
  } = options;

  if (!baseUrl) {
    return null;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  const params = new URLSearchParams();

  if (width) {
    params.set('w', width);
  }
  if (height) {
    params.set('h', height);
  }
  params.set('q', quality);
  params.set('f', format);

  return `${baseUrl}${separator}${params.toString()}`;
};

/**
 * Определение поддержки WebP в браузере
 */
export const supportsWebP = () => new Promise((resolve) => {
  const webP = new Image();
  webP.onload = webP.onerror = () => {
    resolve(webP.height === 2);
  };
  webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
});

/**
 * Определение поддержки AVIF в браузере
 */
export const supportsAVIF = () => new Promise((resolve) => {
  const avif = new Image();
  avif.onload = avif.onerror = () => {
    resolve(avif.height === 2);
  };
  avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGmAAAAAAAgSSgAAAAAAAAAAAAAAAACAAAABAAAABAAAABAAAACgAAAAAA';
});

/**
 * Получение оптимального формата изображения
 */
export const getOptimalFormat = async () => {
  if (await supportsAVIF()) {
    return 'avif';
  }
  if (await supportsWebP()) {
    return 'webp';
  }
  return 'jpg';
};

/**
 * Оптимизация CSS классов
 */
export const optimizeClasses = (...classes) => classes
  .filter(Boolean)
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Дебаунсинг для оптимизации событий
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Троттлинг для оптимизации событий
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Оптимизация анимаций - requestAnimationFrame
 */
export const rafThrottle = (func) => {
  let rafId = null;
  return function executedFunction(...args) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, args);
        rafId = null;
      });
    }
  };
};

/**
 * Измерение производительности компонентов
 */
export const measurePerformance = (name, fn) => (...args) => {
  const start = performance.now();
  const result = fn(...args);
  const end = performance.now();

  if (process.env.NODE_ENV === 'development') {
    console.log(`[PERF] ${name}: ${(end - start).toFixed(2)}ms`);
  }

  return result;
};

/**
 * Оптимизация рендеринга списков
 */
export const virtualizeList = (items, itemHeight, containerHeight, renderItem) => {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = 0;
  const endIndex = Math.min(startIndex + visibleCount, items.length);

  return items.slice(startIndex, endIndex).map((item, index) => renderItem(item, startIndex + index));
};

/**
 * Предзагрузка критичных ресурсов
 */
export const preloadCriticalResources = () => {
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  fontLink.as = 'style';
  document.head.appendChild(fontLink);

  const criticalImages = [
    titleLogo,
    teamLeadImage,
  ];

  criticalImages.forEach((src) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
};
