// Конфигурация API endpoints
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                   (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  PROFILE_UPDATE: `${API_BASE_URL}/api/profile/update`,
  MEDIA_UPLOAD: `${API_BASE_URL}/api/media/upload`,
  USER_MEDIA: `${API_BASE_URL}/api/user/media`,
  BAN_INFO: `${API_BASE_URL}/api/ban/info`,
  SUPPORT_SUBMIT: `${API_BASE_URL}/api/support/submit`,
  SCHEDULE: `${API_BASE_URL}/api/schedule`,
  USERS: `${API_BASE_URL}/api/admin/users`,
  USERS_CREATE: `${API_BASE_URL}/api/admin/users/create`,
  USERS_STATS: `${API_BASE_URL}/api/admin/users/stats`,
  USERS_BAN: `${API_BASE_URL}/api/admin/users/ban`,
  USERS_UNBAN: `${API_BASE_URL}/api/admin/users/unban`,
  NEWS: `${API_BASE_URL}/api/news`,
  LITERATURE: `${API_BASE_URL}/api/literature`,
  DASHBOARD: `${API_BASE_URL}/api/dashboard`,
  LOGOUT: `${API_BASE_URL}/api/logout`,
  THEME: `${API_BASE_URL}/api/theme`,
  MEDIA_SET_ACTIVE: `${API_BASE_URL}/api/media/set-active`,
  MEDIA_DELETE: `${API_BASE_URL}/api/media/delete`,
  SAVE_DATA: `${API_BASE_URL}/api/save_data`,
  AUTH_CHECK: `${API_BASE_URL}/api/auth/check`,
  PUBLIC_STATS: `${API_BASE_URL}/api/public/stats`
};

// Вспомогательная функция для построения URL с API базой
export const buildApiUrl = (path) => {
  return `${API_BASE_URL}${path}`;
};

export default API_ENDPOINTS;
