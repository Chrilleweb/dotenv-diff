import { describe, expect, it } from 'vitest';
import { diffEnv } from '../src/lib/diffEnv.js';

describe('diffEnv', () => {
  it('detects missing and extra keys', () => {
    const current = { A: '1', B: '2', C: '3' };
    const example = { A: '', B: '', D: '' };

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

  it('handles empty .env file as all missing', () => {
    const current = {};
    const example = { A: '', B: '' };

    const result = diffEnv(current, example);

    expect(result.missing).toEqual(['A', 'B']);
    expect(result.extra).toEqual([]);
  });

  it('handles empty .env.example file as all extra', () => {
    const current = { A: '1', B: '2' };
    const example = {};

    const result = diffEnv(current, example);

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual(['A', 'B']);
  });

  it('ignores key order', () => {
    const current = { B: '2', A: '1' };
    const example = { A: '', B: '' };

    const result = diffEnv(current, example);

    expect(result).toEqual({ missing: [], extra: [] });
  });
});
