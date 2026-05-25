import { describe, it, expect } from 'vitest';
import { isLikelyMinified } from '../../../../src/core/helpers/isLikelyMinified.js';

describe('isLikelyMinified', () => {
  it('returns false for empty string', () => {
    expect(isLikelyMinified('')).toBe(false);
  });

  it('returns false for short single-line content', () => {
    expect(isLikelyMinified('const x = 1;')).toBe(false);
  });

  it('returns false for multi-line content where all lines are short', () => {
    const content = 'const x = 1;\nconst y = 2;\nconst z = 3;';
    expect(isLikelyMinified(content)).toBe(false);
  });

  it('returns true when a line exceeds 500 characters', () => {
    const longLine = 'a'.repeat(501);
    expect(isLikelyMinified(longLine)).toBe(true);
  });

  it('returns false when a line is exactly 500 characters', () => {
    const line = 'a'.repeat(500);
    expect(isLikelyMinified(line)).toBe(false);
  });

  it('returns true when only one line in a multi-line string exceeds 500 characters', () => {
    const content = 'short line\n' + 'a'.repeat(501) + '\nanother short line';
    expect(isLikelyMinified(content)).toBe(true);
  });

  it('handles Windows-style line endings (CRLF)', () => {
    const content = 'short\r\n' + 'a'.repeat(501) + '\r\nshort';
    expect(isLikelyMinified(content)).toBe(true);
  });

  it('returns false for Windows-style line endings where all lines are short', () => {
    const content = 'const x = 1;\r\nconst y = 2;\r\n';
    expect(isLikelyMinified(content)).toBe(false);
  });
});
