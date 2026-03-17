/**
 * Система логирования для development и production
 */

// Определяем окружение
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Безопасное логирование ошибок
 * @param {string} message - сообщение
 * @param {any} data - дополнительные данные
 */
export const logError = (message, data = null) => {
  if (isDevelopment) {
    console.error(`[ERROR] ${message}`, data);
  } else {
    // В production можно отправлять ошибки в сервис мониторинга
    // Например: Sentry, LogRocket, или собственный сервис
    // sendToMonitoringService('error', message, data);
  }
};

/**
 * Безопасное логирование предупреждений
 * @param {string} message - сообщение
 * @param {any} data - дополнительные данные
 */
export const logWarning = (message, data = null) => {
  if (isDevelopment) {
    console.warn(`[WARNING] ${message}`, data);
  } else {
    // В production предупреждения можно игнорировать или логировать с низким приоритетом
    // sendToMonitoringService('warning', message, data);
  }
};

/**
 * Безопасное логирование информации
 * @param {string} message - сообщение
 * @param {any} data - дополнительные данные
 */
export const logInfo = (message, data = null) => {
  if (isDevelopment) {
    console.info(`[INFO] ${message}`, data);
  }
  // В production информационные логи обычно игнорируются
};

/**
 * Безопасное логирование отладочной информации
 * @param {string} message - сообщение
 * @param {any} data - дополнительные данные
 */
export const logDebug = (message, data = null) => {
  if (isDevelopment) {
    console.log(`[DEBUG] ${message}`, data);
  }
  // В production отладочные логи всегда игнорируются
};

/**
 * Создает безопасную версию любой функции логирования
 * @param {Function} logFunction - функция логирования
 * @returns {Function} безопасная версия функции
 */
export const createSafeLogger = (logFunction) => {
  return (...args) => {
    try {
      return logFunction(...args);
    } catch (error) {
      // Если логирование вызвало ошибку, игнорируем её
      // чтобы не сломать основную логику приложения
    }
  };
};

// Экспортируем безопасные версии
export const safeLogError = createSafeLogger(logError);
export const safeLogWarning = createSafeLogger(logWarning);
export const safeLogInfo = createSafeLogger(logInfo);
export const safeLogDebug = createSafeLogger(logDebug);

/**
 * Производительность: замеряет время выполнения операции
 * @param {string} label - метка операции
 */
export const startTimer = (label) => {
  if (isDevelopment && performance && performance.mark) {
    performance.mark(`${label}-start`);
  }
};

export const endTimer = (label) => {
  if (isDevelopment && performance && performance.measure) {
    try {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      const measures = performance.getEntriesByName(label);
      if (measures.length > 0) {
        console.log(`[PERF] ${label}: ${measures[0].duration.toFixed(2)}ms`);
      }
    } catch (error) {
      // Игнорируем ошибки производительности
    }
  }
};

/**
 * Группировка логов для лучшей читаемости
 * @param {string} label - метка группы
 * @param {Function} callback - функция с логами
 */
export const logGroup = (label, callback) => {
  if (isDevelopment) {
    console.group(`[GROUP] ${label}`);
    try {
      callback();
    } finally {
      console.groupEnd();
    }
  } else {
    callback();
  }
};
