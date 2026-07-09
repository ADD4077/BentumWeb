// API endpoints configuration
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  CSRF: `${API_BASE_URL}/api/csrf`,
  PROFILE_UPDATE: `${API_BASE_URL}/api/profile/update`,
  PROFILE_PREFERENCES: `${API_BASE_URL}/api/profile/preferences`,
  MEDIA_UPLOAD: `${API_BASE_URL}/api/media/upload`,
  USER_MEDIA: `${API_BASE_URL}/api/user/media`,
  NOTIFICATIONS: `${API_BASE_URL}/api/notifications`,
  NOTIFICATIONS_RECENT: `${API_BASE_URL}/api/notifications/recent`,
  NOTIFICATIONS_READ_ALL: `${API_BASE_URL}/api/notifications/read-all`,
  BAN_INFO: `${API_BASE_URL}/api/ban/info`,
  SUPPORT_SUBMIT: `${API_BASE_URL}/api/support/submit`,
  SUPPORT_MY_THREADS: `${API_BASE_URL}/api/support/my/threads`,
  SUPPORT_MY_THREAD_DETAIL: (threadId) => `${API_BASE_URL}/api/support/my/threads/${threadId}`,
  SUPPORT_MY_THREAD_REPLY: (threadId) => `${API_BASE_URL}/api/support/my/threads/${threadId}/reply`,
  SUPPORT_MODER_THREADS: `${API_BASE_URL}/api/support/moder/threads`,
  SUPPORT_MODER_THREAD_DETAIL: (threadId) => `${API_BASE_URL}/api/support/moder/threads/${threadId}`,
  SUPPORT_MODER_THREAD_REPLY: (threadId) => `${API_BASE_URL}/api/support/moder/threads/${threadId}/reply`,
  SUPPORT_MODER_THREAD_STATUS: (threadId) => `${API_BASE_URL}/api/support/moder/threads/${threadId}/status`,
  SCHEDULE: `${API_BASE_URL}/api/schedule`,
  SCHEDULE_NEXT: `${API_BASE_URL}/api/schedule/next`,
  USERS: `${API_BASE_URL}/api/admin/users`,
  USERS_CREATE: `${API_BASE_URL}/api/admin/users/create`,
  USERS_STATS: `${API_BASE_URL}/api/admin/users/stats`,
  ADMIN_ACTIVITY: `${API_BASE_URL}/api/admin/activity`,
  ADMIN_USER_PROFILE: (userId) => `${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/profile`,
  USERS_BAN: `${API_BASE_URL}/api/admin/users/ban`,
  USERS_UNBAN: `${API_BASE_URL}/api/admin/users/unban`,
  USER_BY_CODE: (studentCode) => `${API_BASE_URL}/api/user/by-code/${encodeURIComponent(studentCode)}`,
  ADMINISTRATORS: `${API_BASE_URL}/api/admin/administrators`,
  NEWS: `${API_BASE_URL}/api/news`,
  LITERATURE: `${API_BASE_URL}/api/literature`,
  EVENTS: `${API_BASE_URL}/api/events/`,
  EVENT_ITEM: (eventId) => `${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}`,
  EVENT_COMPLETE: (eventId) => `${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/complete`,
  EVENT_PARTICIPANTS: (eventId) => `${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/participants`,
  EVENT_ATTENDANCE: (eventId) => `${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/attendance`,
  EVENT_PARTICIPANT_ITEM: (eventId, participationId) => `${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(participationId)}`,
  EVENT_PARTICIPATION: (eventId) => `${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/participation`,
  DASHBOARD: `${API_BASE_URL}/api/dashboard`,
  LOGOUT: `${API_BASE_URL}/api/logout`,
  THEME: `${API_BASE_URL}/api/theme`,
  MEDIA_SET_ACTIVE: `${API_BASE_URL}/api/media/set-active`,
  MEDIA_DELETE: `${API_BASE_URL}/api/media/delete`,
  SAVE_DATA: `${API_BASE_URL}/api/save_data`,
  AUTH_CHECK: `${API_BASE_URL}/api/auth/check`,
  PUBLIC_STATS: `${API_BASE_URL}/api/public/stats`,
  DEV_TEAM: `${API_BASE_URL}/api/public/dev-team`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/change-password/password`,
  TELEGRAM_GENERATE_LINK: `${API_BASE_URL}/api/telegram/generate-link`,
  TELEGRAM_BINDING_STATUS: `${API_BASE_URL}/api/telegram/binding-status`,
  TELEGRAM_UNLINK: `${API_BASE_URL}/api/telegram/unlink`,
  TELEGRAM_BIND: `${API_BASE_URL}/api/telegram/bind`,
  SESSIONS: `${API_BASE_URL}/api/sessions`,
  SESSION_CLOSE: `${API_BASE_URL}/api/sessions/close`,
  TWO_FA_CONFIG: `${API_BASE_URL}/api/2fa/config`,
  TWO_FA_VERIFY: `${API_BASE_URL}/api/2fa/verify`,
  TWO_FA_RESEND: `${API_BASE_URL}/api/2fa/resend`,
};

export const buildApiUrl = (path) => {
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
};

export default API_ENDPOINTS;
