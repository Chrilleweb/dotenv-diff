import { describe, it, expect } from 'vitest';
import { filterIgnoredKeys } from '../../src/core/filterIgnoredKeys.js';

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
});
