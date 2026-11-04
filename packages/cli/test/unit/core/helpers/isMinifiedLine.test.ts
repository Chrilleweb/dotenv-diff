import { describe, it, expect } from 'vitest';
import {
  isMinifiedLine,
  MINIFIED_LINE_LENGTH,
} from '../../../../src/core/helpers/isMinifiedLine.js';

describe('isMinifiedLine', () => {
  it('returns false for an empty line', () => {
    expect(isMinifiedLine('')).toBe(false);
  });

  it('returns false for a short line', () => {
    expect(isMinifiedLine('const x = 1;')).toBe(false);
  });

  it('returns false when a line is exactly at the limit', () => {
    expect(isMinifiedLine('a'.repeat(MINIFIED_LINE_LENGTH))).toBe(false);
  });

  it('returns true when a line exceeds the limit', () => {
    expect(isMinifiedLine('a'.repeat(MINIFIED_LINE_LENGTH + 1))).toBe(true);
  });
});
