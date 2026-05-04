import { beforeEach, describe, expect, test } from 'vitest';

import { clearAuthStorage } from '../utils/storage.js';

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('clears stale admin user cache on auth cleanup', () => {
    localStorage.setItem('admin_users', JSON.stringify([{ id: 1 }]));

    clearAuthStorage();

    expect(localStorage.getItem('admin_users')).toBeNull();
  });
});
