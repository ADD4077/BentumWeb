const DEFAULT_ALLOWED_PROTOCOLS = ['https:'];

const normalizeHostname = (hostname) => hostname.replace(/\.$/, '').toLowerCase();

const hostMatches = (hostname, allowedHost) => {
  const current = normalizeHostname(hostname);
  const allowed = normalizeHostname(allowedHost);
  return current === allowed || current.endsWith(`.${allowed}`);
};

export const sanitizeExternalUrl = (value, options = {}) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const {
    allowedHosts = null,
    allowedProtocols = DEFAULT_ALLOWED_PROTOCOLS,
    allowSameOrigin = true,
  } = options;

  let parsedUrl;
  try {
    parsedUrl = new URL(value, window.location.origin);
  } catch {
    return null;
  }

  const isSameOrigin = parsedUrl.origin === window.location.origin;
  if (allowedHosts?.length) {
    const isAllowedHost = allowedHosts.some((host) => hostMatches(parsedUrl.hostname, host));
    if (!isAllowedHost) {
      return null;
    }
  } else if (!isSameOrigin && !allowedProtocols.includes(parsedUrl.protocol)) {
    return null;
  }

  if (!allowSameOrigin && isSameOrigin) {
    return null;
  }

  if (allowedHosts?.length && !allowedProtocols.includes(parsedUrl.protocol)) {
    return null;
  }

  return parsedUrl.href;
};

export const sanitizeTelegramUrl = (value) => sanitizeExternalUrl(value, {
  allowedHosts: ['t.me', 'telegram.me'],
  allowSameOrigin: false,
});

export const openExternalUrl = (value, options = {}) => {
  const safeUrl = sanitizeExternalUrl(value, options);
  if (!safeUrl) {
    return false;
  }

  window.open(safeUrl, '_blank', 'noopener,noreferrer');
  return true;
};
