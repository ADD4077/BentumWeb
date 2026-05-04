let isConfigured = false;
let sentryClient = null;

const parseSampleRate = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, parsed));
};

export const initSentry = async () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn || isConfigured) {
    return;
  }

  sentryClient = await import('@sentry/react');
  sentryClient.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0),
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });

  isConfigured = true;
};

export const captureException = (error, context = {}) => {
  if (!isConfigured || !sentryClient) {
    return;
  }

  sentryClient.captureException(error, context);
};
