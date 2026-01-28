import { describe, it, expect } from 'vitest';
import { filterIgnoredKeys } from '../../../src/core/filterIgnoredKeys.js';

describe('filterIgnoredKeys', () => {
  it('filters exact and regex matches', () => {
    const keys = ['API_KEY', 'SESSION_ID', 'SECRET_TOKEN', 'DEBUG'];
    const ignore = ['API_KEY'];
    const regex = [/^SECRET_/];
    const res = filterIgnoredKeys(keys, ignore, regex);
    expect(res).toEqual(['SESSION_ID', 'DEBUG']);
  });

  it('handles overlap between ignore and regex', () => {
    const keys = ['A', 'B'];
    const ignore = ['B'];
    const regex = [/B/];
    const res = filterIgnoredKeys(keys, ignore, regex);
    expect(res).toEqual(['A']);
  });

  it('returns original keys when no ignores provided', () => {
    const keys = ['FOO', 'BAR'];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(keys);
  });

  it('always filters out DEFAULT_EXCLUDE_KEYS', () => {
    const keys = [
      'PWD',
      'API_KEY',
      'NODE_ENV',
      'MODE',
      'BASE_URL',
      'PROD',
      'DEV',
      'SSR',
      'DB_URL',
    ];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(['API_KEY', 'DB_URL']);
  });

  it('filters combination of ignore list, regex, and DEFAULT_EXCLUDE_KEYS', () => {
    const keys = ['API_KEY', 'NODE_ENV', 'SECRET_TOKEN', 'MODE', 'DEBUG', 'PWD'];
    const ignore = ['DEBUG'];
    const regex = [/^SECRET_/];
    const res = filterIgnoredKeys(keys, ignore, regex);
    expect(res).toEqual(['API_KEY']);
    expect(res).not.toContain('NODE_ENV');
    expect(res).not.toContain('MODE');
    expect(res).not.toContain('PWD');
  });
});
