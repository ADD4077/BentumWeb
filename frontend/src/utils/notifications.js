/**
 * Простая система уведомлений для замены alert()
 */

/**
 * Показывает уведомление пользователю
 * @param {string} message - сообщение
 * @param {string} type - тип ('success', 'error', 'warning', 'info')
 * @param {number} duration - время показа в мс
 */
export const showNotification = (message, type = 'info', duration = 5000) => {
  const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';

  // Создаем элемент уведомления
  const notification = document.createElement('div');
  notification.className = `notification notification-${safeType}`;

  const content = document.createElement('div');
  content.className = 'notification-content';

  const messageElement = document.createElement('span');
  messageElement.className = 'notification-message';
  messageElement.textContent = String(message ?? '');

  const closeButton = document.createElement('button');
  closeButton.className = 'notification-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Закрыть уведомление');
  closeButton.textContent = '×';

  content.append(messageElement, closeButton);
  notification.appendChild(content);
  
  // Добавляем стили если еще не добавлены
  if (!document.getElementById('notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 300px;
        max-width: 500px;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .notification.show {
        transform: translateX(0);
      }
      
      .notification-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: 1px solid #059669;
      }
      
      .notification-error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border: 1px solid #dc2626;
      }
      
      .notification-warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        border: 1px solid #d97706;
      }
      
      .notification-info {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        border: 1px solid #2563eb;
      }
      
      .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      
      .notification-message {
        flex: 1;
        font-weight: 500;
      }
      
      .notification-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        transition: background-color 0.2s;
        flex-shrink: 0;
      }
      
      .notification-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      @media (max-width: 640px) {
        .notification {
          top: 10px;
          right: 10px;
          left: 10px;
          min-width: auto;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(styles);
  }
  
  // Добавляем в DOM
  document.body.appendChild(notification);
  
  // Показываем уведомление
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Обработчик закрытия
  const closeNotification = () => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  };
  
  // Закрытие по клику на крестик
  closeButton.addEventListener('click', closeNotification);
  
  // Автоматическое закрытие
  if (duration > 0) {
    setTimeout(closeNotification, duration);
  }
  
  return closeNotification;
};

/**
 * Удобные функции для разных типов уведомлений
 */
export const showSuccess = (message, duration = 5000) => {
  return showNotification(message, 'success', duration);
};

export const showError = (message, duration = 7000) => {
  return showNotification(message, 'error', duration);
};

export const showWarning = (message, duration = 6000) => {
  return showNotification(message, 'warning', duration);
};

export const showInfo = (message, duration = 5000) => {
  return showNotification(message, 'info', duration);
};
