import { describe, it, expect } from 'vitest';
import { compareCodePoint } from '../../../../src/core/helpers/compareCodePoint.js';

describe('compareCodePoint', () => {
  it('returns -1 when a sorts before b', () => {
    expect(compareCodePoint('.env.aaa', '.env.zzz')).toBe(-1);
  });

  it('returns 1 when a sorts after b', () => {
    expect(compareCodePoint('.env.zzz', '.env.aaa')).toBe(1);
  });

  it('returns 0 when both strings are equal', () => {
    expect(compareCodePoint('.env', '.env')).toBe(0);
  });

  it('orders by code point regardless of locale collation rules', () => {
    const input = ['.env.zzz', '.env.aaa', '.env.mmm'];
    const sorted = [...input].sort(compareCodePoint);
    expect(sorted).toEqual(['.env.aaa', '.env.mmm', '.env.zzz']);
  });
});
