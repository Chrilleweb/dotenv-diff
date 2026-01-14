import { describe, it, expect } from 'vitest';
import { shannonEntropyNormalized } from '../../src/core/security/entropy.js';

describe('shannonEntropyNormalized', () => {
  it('returns 0 for empty string', () => {
    expect(shannonEntropyNormalized('')).toBe(0);
  });

  it('returns 0 for falsy input', () => {
    expect(shannonEntropyNormalized(undefined as unknown as string)).toBe(0);
  });

    it('returns 0 for string with only one unique character', () => {
    // No randomness at all
    expect(shannonEntropyNormalized('aaaaaaaaaa')).toBe(0);
  });

    it('returns low entropy for uneven character distribution', () => {
    // Mostly one character, a little noise
    const value = 'aaaaaaaaab';
    const entropy = shannonEntropyNormalized(value);

    expect(entropy).toBeGreaterThan(0);
    expect(entropy).toBeLessThan(0.5);
  });

    it('returns high entropy for evenly distributed characters', () => {
    // Many unique characters, fairly even distribution
    const value =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
    const entropy = shannonEntropyNormalized(value);

    expect(entropy).toBeGreaterThan(0.8);
    expect(entropy).toBeLessThanOrEqual(1);
  });

    it('never returns a value greater than 1', () => {
    // Defensive guard for Math.min(1, ...)
    const value =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/'.repeat(
        5,
      );

    expect(shannonEntropyNormalized(value)).toBeLessThanOrEqual(1);
  });
});
