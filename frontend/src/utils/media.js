import { buildApiUrl } from '../config/api.js';

/**
 * Безопасно строит URL для медиа файлов
 * @param {string} path - путь к медиа файлу (например, /media/avatars/file.jpg)
 * @returns {string} полный URL к медиа файлу
 */
export const buildMediaUrl = (path) => {
  if (!path) return '';
  
  // Если путь уже полный URL, возвращаем как есть
  if (path.startsWith('http')) {
    return path;
  }
  
  // Если путь начинается с /, убираем его чтобы избежать двойного //
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  return buildApiUrl(`/${cleanPath}`);
};

/**
 * Проверяет, является ли URL валидным медиа URL
 * @param {string} url - URL для проверки
 * @returns {boolean} true если URL валидный
 */
export const isValidMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Проверяем на http/https URL или относительный путь
  return url.startsWith('http') || url.startsWith('/media/');
};
