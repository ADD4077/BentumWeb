import { API_ENDPOINTS } from '../config/api.js';

let csrfRequest = null;
let originalFetch = null;

const getCookie = (name) => {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const isMutatingMethod = (method = 'GET') => !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());

const isSameOrigin = (input) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (!url || url.startsWith('/')) {
    return true;
  }

  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
};

export const ensureCsrfToken = async () => {
  if (getCookie('csrftoken')) {
    return getCookie('csrftoken');
  }

  if (!csrfRequest) {
    const fetchImpl = originalFetch || window.fetch.bind(window);
    csrfRequest = fetchImpl(API_ENDPOINTS.CSRF, {
      method: 'GET',
      credentials: 'include',
    }).finally(() => {
      csrfRequest = null;
    });
  }

  await csrfRequest;
  return getCookie('csrftoken');
};

export const buildCsrfHeaders = async (headers = {}) => {
  const csrfToken = await ensureCsrfToken();
  const nextHeaders = new Headers(headers);

  if (csrfToken && !nextHeaders.has('X-CSRFToken')) {
    nextHeaders.set('X-CSRFToken', csrfToken);
  }

  return nextHeaders;
};

export const installHttpInterceptor = () => {
  if (typeof window === 'undefined' || originalFetch) {
    return;
  }

  originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const request = new Request(input, init);
    const headers = new Headers(request.headers);
    const method = request.method || init.method || 'GET';
    const isFormDataBody = init.body instanceof FormData;

    // Let the browser generate the multipart boundary itself.
    if (isFormDataBody) {
      headers.delete('Content-Type');
    }

    if (isSameOrigin(input) && isMutatingMethod(method)) {
      const csrfToken = await ensureCsrfToken();
      if (csrfToken && !headers.has('X-CSRFToken')) {
        headers.set('X-CSRFToken', csrfToken);
      }
    }

    return originalFetch(input, {
      ...init,
      credentials: init.credentials || request.credentials || 'include',
      headers,
    });
  };
};
