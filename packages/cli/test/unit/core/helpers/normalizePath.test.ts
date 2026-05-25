import { describe, it, expect } from 'vitest';
import { normalizePath } from '../../../../src/core/helpers/normalizePath.js';

describe('normalizePath', () => {
  it('returns forward-slash paths unchanged', () => {
    expect(normalizePath('src/core/helpers/normalizePath.ts')).toBe(
      'src/core/helpers/normalizePath.ts',
    );
  });

  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('src\\core\\helpers\\normalizePath.ts')).toBe(
      'src/core/helpers/normalizePath.ts',
    );
  });

  it('converts mixed slashes to forward slashes', () => {
    expect(normalizePath('src/core\\helpers/file.ts')).toBe(
      'src/core/helpers/file.ts',
    );
  });

  it('handles Windows absolute paths', () => {
    expect(normalizePath('C:\\Users\\user\\project\\file.ts')).toBe(
      'C:/Users/user/project/file.ts',
    );
  });

  it('returns empty string unchanged', () => {
    expect(normalizePath('')).toBe('');
  });

  it('handles a single backslash', () => {
    expect(normalizePath('\\')).toBe('/');
  });

  it('handles paths with no slashes', () => {
    expect(normalizePath('file.ts')).toBe('file.ts');
  });
});
