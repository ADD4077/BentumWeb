export function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const normalizedValue = value < 1_000_000_000_000 ? value * 1000 : value;
    const parsedFromNumber = new Date(normalizedValue);
    return Number.isNaN(parsedFromNumber.getTime()) ? null : parsedFromNumber;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return null;
  }

  if (/^\d+$/.test(stringValue)) {
    const numericValue = Number(stringValue);
    const normalizedNumericValue = numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
    const parsedNumericDate = new Date(normalizedNumericValue);
    return Number.isNaN(parsedNumericDate.getTime()) ? null : parsedNumericDate;
  }

  const parsedDate = new Date(stringValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function formatDateTime(value, fallback = 'Не указано') {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(value, fallback = 'Не указана') {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTimeOnly(value, fallback = 'Не указано') {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(value, fallback = 'Нет данных') {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) {
    return fallback;
  }

  const now = Date.now();
  const diffMs = now - parsedDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) {
    return 'Только что';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} мин. назад`;
  }

  if (diffHours < 24) {
    return `${diffHours} ч. назад`;
  }

  if (diffDays < 7) {
    return `${diffDays} дн. назад`;
  }

  return formatDateTime(parsedDate, fallback);
}

export function getDateSortValue(value) {
  const parsedDate = parseDateValue(value);
  return parsedDate ? parsedDate.getTime() : 0;
}
