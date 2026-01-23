import { describe, it, expect, beforeEach } from 'vitest';
import {
  updateTotals,
  type Totals,
} from '../../../../src/core/compare/updateTotals.js';
import type {
  CompareJsonEntry,
  Filtered,
} from '../../../../src/config/types.js';

describe('updateTotals', () => {
  let totals: Totals;
  let entry: CompareJsonEntry;

  beforeEach(() => {
    totals = {
      missing: 0,
      extra: 0,
      empty: 0,
      mismatch: 0,
      duplicate: 0,
      gitignore: 0,
    };

    entry = {
      env: '.env',
      example: '.env.example',
    };
  });

  it('updates missing keys and returns exitWithError=true', () => {
    const filtered: Filtered = {
      missing: ['KEY1', 'KEY2'],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: null,
    };

    const exitWithError = updateTotals(filtered, totals, entry);

    expect(totals.missing).toBe(2);
    expect(entry.missing).toEqual(['KEY1', 'KEY2']);
    expect(exitWithError).toBe(true);
  });

  it('updates extra keys without exit error', () => {
    const filtered: Filtered = {
      missing: [],
      extra: ['EXTRA1', 'EXTRA2'],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: null,
    };

    const exitWithError = updateTotals(filtered, totals, entry);

    expect(totals.extra).toBe(2);
    expect(entry.extra).toEqual(['EXTRA1', 'EXTRA2']);
    expect(exitWithError).toBe(false);
  });

  it('updates empty values', () => {
    const filtered: Filtered = {
      missing: [],
      empty: ['EMPTY1'],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: null,
    };

    updateTotals(filtered, totals, entry);

    expect(totals.empty).toBe(1);
    expect(entry.empty).toEqual(['EMPTY1']);
  });

  it('updates value mismatches', () => {
    const filtered: Filtered = {
      missing: [],
      mismatches: [{ key: 'KEY1', expected: 'a', actual: 'b' }],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: null,
    };

    updateTotals(filtered, totals, entry);

    expect(totals.mismatch).toBe(1);
    expect(entry.valueMismatches).toEqual([
      { key: 'KEY1', expected: 'a', actual: 'b' },
    ]);
  });

  it('updates duplicates from both env and example', () => {
    const filtered: Filtered = {
      missing: [],
      duplicatesEnv: [{ key: 'DUP1', count: 2 }],
      duplicatesEx: [{ key: 'DUP2', count: 3 }],
      gitignoreIssue: null,
    };

    updateTotals(filtered, totals, entry);

    expect(totals.duplicate).toBe(2);
  });

  it('updates gitignore issue count', () => {
    const filtered: Filtered = {
      missing: [],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: { reason: 'not-ignored' },
    };

    updateTotals(filtered, totals, entry);

    expect(totals.gitignore).toBe(1);
  });

  it('handles multiple issues and accumulates totals correctly', () => {
    const filtered: Filtered = {
      missing: ['MISS1'],
      extra: ['EXTRA1'],
      empty: ['EMPTY1'],
      duplicatesEnv: [{ key: 'DUP1', count: 2 }],
      duplicatesEx: [],
      gitignoreIssue: { reason: 'not-ignored' },
    };

    const exitWithError = updateTotals(filtered, totals, entry);

    expect(totals.missing).toBe(1);
    expect(totals.extra).toBe(1);
    expect(totals.empty).toBe(1);
    expect(totals.duplicate).toBe(1);
    expect(totals.gitignore).toBe(1);
    expect(exitWithError).toBe(true);
  });

  it('returns false when only non-critical issues exist', () => {
    const filtered: Filtered = {
      missing: [],
      extra: ['EXTRA1'],
      empty: ['EMPTY1'],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: null,
    };

    const exitWithError = updateTotals(filtered, totals, entry);

    expect(exitWithError).toBe(false);
  });
});
