import { describe, expect, it } from 'vitest';

import { USER_ROLE_OPTIONS, getRoleLabel } from '../utils/roles.js';

describe('roles utils', () => {
  it('returns readable labels for known roles', () => {
    expect(getRoleLabel('student')).toBe('Студент');
    expect(getRoleLabel('teacher')).toBe('Преподаватель');
    expect(getRoleLabel('chairperson')).toBe('Председатель');
    expect(getRoleLabel('moderator')).toBe('Модератор');
  });

  it('falls back to the raw role or default student label', () => {
    expect(getRoleLabel('custom-role')).toBe('custom-role');
    expect(getRoleLabel()).toBe('Студент');
  });

  it('does not expose administrator in user creation roles', () => {
    const values = USER_ROLE_OPTIONS.map((role) => role.value);

    expect(values).toEqual(['student', 'teacher', 'chairperson', 'moderator']);
    expect(values).not.toContain('administrator');
  });
});
