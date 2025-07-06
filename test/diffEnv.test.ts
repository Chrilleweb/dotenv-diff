import { describe, expect, it } from 'vitest';
import { diffEnv } from '../src/lib/diffEnv.js';

describe('diffEnv', () => {
  it('detects missing and extra keys', () => {
    const current = {
      A: '1',
      B: '2',
      C: '3',
    };

    const example = {
      A: '',
      B: '',
      D: '',
    };

    const result = diffEnv(current, example);

    expect(result.missing).toEqual(['D']);
    expect(result.extra).toEqual(['C']);
  });

  it('returns empty arrays when keys match', () => {
    const current = { A: '1', B: '2' };
    const example = { A: '', B: '' };

    const result = diffEnv(current, example);

    expect(result).toEqual({ missing: [], extra: [] });
  });
});
