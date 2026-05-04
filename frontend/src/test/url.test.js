import { describe, expect, test } from 'vitest';

import { sanitizeExternalUrl, sanitizeTelegramUrl } from '../utils/url.js';

describe('url utilities', () => {
  test('rejects script and insecure external URLs', () => {
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeExternalUrl('http://evil.example/file.pdf')).toBeNull();
  });

  test('allows https and same-origin relative URLs', () => {
    expect(sanitizeExternalUrl('https://example.com/file.pdf')).toBe('https://example.com/file.pdf');
    expect(sanitizeExternalUrl('/media/file.pdf')).toBe('http://localhost:3000/media/file.pdf');
  });

  test('restricts telegram binding links to Telegram hosts', () => {
    expect(sanitizeTelegramUrl('https://t.me/BNTUnity')).toBe('https://t.me/BNTUnity');
    expect(sanitizeTelegramUrl('https://evil.example/bot')).toBeNull();
    expect(sanitizeTelegramUrl('/local-path')).toBeNull();
  });
});
