import { describe, it, expect } from 'vitest';
import path from 'path';
import { resolveFromCwd } from '../../../../src/core/helpers/resolveFromCwd.js';

describe('resolveFromCwd', () => {
  it('returns absolute paths unchanged', () => {
    const absolutePath = '/absolute/path/to/file.ts';
    const result = resolveFromCwd('/some/cwd', absolutePath);
    expect(result).toBe(absolutePath);
  });

  it('resolves relative paths against cwd', () => {
    const result = resolveFromCwd('/base/dir', 'relative/file.ts');
    expect(result).toBe(path.resolve('/base/dir', 'relative/file.ts'));
  });

  it('handles ./ prefix correctly', () => {
    const result = resolveFromCwd('/base/dir', './file.ts');
    expect(result).toBe(path.resolve('/base/dir', './file.ts'));
  });

  it('handles ../ parent directory traversal', () => {
    const result = resolveFromCwd('/base/dir/subdir', '../file.ts');
    expect(result).toBe(path.resolve('/base/dir/subdir', '../file.ts'));
  });

  it('handles nested relative paths', () => {
    const result = resolveFromCwd('/base', 'sub/dir/file.ts');
    expect(result).toBe(path.resolve('/base', 'sub/dir/file.ts'));
  });

  it('works with different cwd', () => {
    const result = resolveFromCwd('/different/cwd', 'file.ts');
    expect(result).toBe(path.resolve('/different/cwd', 'file.ts'));
  });

  it('handles empty relative path', () => {
    const result = resolveFromCwd('/base/dir', '');
    expect(result).toBe(path.resolve('/base/dir', ''));
  });
});
