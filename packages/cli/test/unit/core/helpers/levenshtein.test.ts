import { describe, it, expect } from 'vitest';
import { levenshtein } from '../../../../src/core/helpers/levenshtein.js';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('DATABASE_URL', 'DATABASE_URL')).toBe(0);
  });

  it('returns the length when one string is empty', () => {
    expect(levenshtein('', 'ABC')).toBe(3);
    expect(levenshtein('ABC', '')).toBe(3);
  });

  it('counts a single deletion', () => {
    expect(levenshtein('DATABASE_URL', 'DATABAS_URL')).toBe(1);
  });

  it('counts a single substitution', () => {
    expect(levenshtein('API_KEY', 'API_KEZ')).toBe(1);
  });

  it('counts a single insertion', () => {
    expect(levenshtein('PORT', 'PORTS')).toBe(1);
  });

  it('is symmetric', () => {
    expect(levenshtein('SECRET', 'SECRT')).toBe(levenshtein('SECRT', 'SECRET'));
  });

  it('computes distance for completely different strings', () => {
    expect(levenshtein('FOO', 'BAR')).toBe(3);
  });
});
