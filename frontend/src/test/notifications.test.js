import { describe, expect, test } from 'vitest';

import { showError } from '../utils/notifications.js';

describe('notifications', () => {
  test('renders notification messages as text instead of HTML', () => {
    showError('<img src=x onerror="window.__xss = true">', 0);

    const message = document.querySelector('.notification-message');
    expect(message).not.toBeNull();
    expect(message.textContent).toBe('<img src=x onerror="window.__xss = true">');
    expect(message.querySelector('img')).toBeNull();
  });
});
