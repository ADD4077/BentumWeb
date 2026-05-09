import { API_ENDPOINTS } from '../config/api.js';
import { buildCsrfHeaders } from '../utils/http.js';

const AUTH_CHECK_CACHE_TTL_MS = 3000;

let authCheckPromise = null;
let authCheckCache = null;
let authCheckCacheAt = 0;

function readAuthCheckCache() {
  if (!authCheckCache) {
    return null;
  }
  if (Date.now() - authCheckCacheAt > AUTH_CHECK_CACHE_TTL_MS) {
    authCheckCache = null;
    authCheckCacheAt = 0;
    return null;
  }
  return authCheckCache;
}

function writeAuthCheckCache(payload) {
  authCheckCache = payload;
  authCheckCacheAt = Date.now();
  return payload;
}

function clearAuthCheckCache() {
  authCheckPromise = null;
  authCheckCache = null;
  authCheckCacheAt = 0;
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildNetworkErrorPayload() {
  return {
    ok: false,
    status: 0,
      detail: 'Ошибка сети',
  };
}

async function requestJson(url, options = {}) {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
    });
    const data = await parseJsonResponse(response);
    return {
      ok: response.ok,
      status: response.status,
      ...(data || {}),
    };
  } catch {
    return buildNetworkErrorPayload();
  }
}

async function requestJsonWithCsrf(url, options = {}, headers = {}) {
  const csrfHeaders = await buildCsrfHeaders(headers);
  return requestJson(url, {
    ...options,
    headers: csrfHeaders,
  });
}

function throwForHttpError(payload) {
  if (payload.ok) {
    return;
  }
  const error = new Error(`HTTP error! status: ${payload.status}`);
  error.response = { status: payload.status };
  throw error;
}

export const api = {
  clearAuthCheckCache,

  async saveData(userData) {
    const payload = await requestJsonWithCsrf(
      API_ENDPOINTS.SAVE_DATA,
      {
        method: 'POST',
        body: JSON.stringify(userData),
      },
      {
        'Content-Type': 'application/json',
      },
    );

    if (payload.success || payload.requires_2fa) {
      clearAuthCheckCache();
    }

    return payload;
  },

  async authCheck({ force = false } = {}) {
    if (!force) {
      const cached = readAuthCheckCache();
      if (cached) {
        return cached;
      }

      if (authCheckPromise) {
        return authCheckPromise;
      }
    }

    authCheckPromise = (async () => {
      const payload = await requestJson(API_ENDPOINTS.AUTH_CHECK, {
        method: 'GET',
      });
      return writeAuthCheckCache(payload);
    })();

    try {
      return await authCheckPromise;
    } finally {
      authCheckPromise = null;
    }
  },

  async getNextScheduleLesson(_studentCode = null) {
    return requestJson(API_ENDPOINTS.SCHEDULE_NEXT, {
      method: 'GET',
    });
  },

  async verify2FACode(code) {
    return requestJsonWithCsrf(
      API_ENDPOINTS.TWO_FA_VERIFY,
      {
        method: 'POST',
        body: JSON.stringify({ code }),
      },
      {
        'Content-Type': 'application/json',
      },
    );
  },

  async get2FAConfig() {
    return requestJson(API_ENDPOINTS.TWO_FA_CONFIG, {
      method: 'GET',
    });
  },

  async set2FAConfig(enabled, method) {
    return requestJsonWithCsrf(
      API_ENDPOINTS.TWO_FA_CONFIG,
      {
        method: 'POST',
        body: JSON.stringify({ enabled, method }),
      },
      {
        'Content-Type': 'application/json',
      },
    );
  },

  async resend2FACode() {
    return requestJsonWithCsrf(
      API_ENDPOINTS.TWO_FA_RESEND,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      {
        'Content-Type': 'application/json',
      },
    );
  },

  async getDashboard() {
    const payload = await requestJson(API_ENDPOINTS.DASHBOARD, {
      method: 'GET',
    });
    clearAuthCheckCache();
    throwForHttpError(payload);
    return payload;
  },

  async logout() {
    const payload = await requestJsonWithCsrf(API_ENDPOINTS.LOGOUT, {
      method: 'POST',
    });
    throwForHttpError(payload);
    return payload;
  },

  async saveTheme(theme) {
    const payload = await requestJsonWithCsrf(
      API_ENDPOINTS.THEME,
      {
        method: 'POST',
        body: JSON.stringify({ theme }),
      },
      {
        'Content-Type': 'application/json',
      },
    );
    throwForHttpError(payload);
    return payload;
  },
};
