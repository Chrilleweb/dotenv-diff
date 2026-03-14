import { describe, it, expect } from 'vitest';
import { compareJsonOutput } from '../../../../src/ui/compare/compareJsonOutput.js';
import type {
  Filtered,
  Duplicate,
  GitignoreIssue,
} from '../../../../src/config/types';

describe('compareJsonOutput', () => {
  const baseParams = {
    envName: '.env',
    exampleName: '.env.example',
    dupsEnv: [] as Duplicate[],
    dupsEx: [] as Duplicate[],
    gitignoreIssue: null,
  };

  it('returns minimal entry when only required fields are provided', () => {
    const result = compareJsonOutput(baseParams);

    expect(result).toEqual({
      env: '.env',
      example: '.env.example',
    });
  });

  it('adds stats when provided', () => {
    const result = compareJsonOutput({
      ...baseParams,
      stats: {
        envCount: 5,
        exampleCount: 4,
        sharedCount: 3,
      },
    });

    expect(result.stats).toEqual({
      envCount: 5,
      exampleCount: 4,
      sharedCount: 3,
    });
  });

  it('adds filtered properties when arrays contain values', () => {
    const filtered: Filtered = {
      missing: ['A'],
      extra: ['B'],
      empty: ['C'],
      mismatches: [
        {
          key: 'D',
          expected: '1',
          actual: '2',
        },
      ],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: null,
    };

    const result = compareJsonOutput({
      ...baseParams,
      filtered,
    });

    expect(result.missing).toEqual(['A']);
    expect(result.extra).toEqual(['B']);
    expect(result.empty).toEqual(['C']);
    expect(result.valueMismatches).toEqual([
      { key: 'D', expected: '1', actual: '2' },
    ]);
  });

  it('does not add filtered properties when arrays are empty', () => {
    const filtered: Filtered = {
      missing: [],
      extra: [],
      empty: [],
      mismatches: [],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: null,
    };

    const result = compareJsonOutput({
      ...baseParams,
      filtered,
    });

    expect(result.missing).toBeUndefined();
    expect(result.extra).toBeUndefined();
    expect(result.empty).toBeUndefined();
    expect(result.valueMismatches).toBeUndefined();
  });

  it('adds duplicates when both env and example contain duplicates', () => {
    const dupsEnv: Duplicate[] = [{ key: 'A', count: 2 }];
    const dupsEx: Duplicate[] = [{ key: 'B', count: 3 }];

    const result = compareJsonOutput({
      ...baseParams,
      dupsEnv,
      dupsEx,
    });

    expect(result.duplicates).toEqual({
      env: dupsEnv,
      example: dupsEx,
    });
  });

  it('adds duplicates only for env', () => {
    const dupsEnv: Duplicate[] = [{ key: 'A', count: 2 }];

    const result = compareJsonOutput({
      ...baseParams,
      dupsEnv,
    });

    expect(result.duplicates).toEqual({
      env: dupsEnv,
    });
  });

  it('adds duplicates only for example', () => {
    const dupsEx: Duplicate[] = [{ key: 'B', count: 3 }];

    const result = compareJsonOutput({
      ...baseParams,
      dupsEx,
    });

    expect(result.duplicates).toEqual({
      example: dupsEx,
    });
  });

  it('adds gitignoreIssue when provided', () => {
    const issue: { reason: GitignoreIssue } = {
      reason: 'MISSING_ENV_IN_GITIGNORE' as GitignoreIssue,
    };

    const result = compareJsonOutput({
      ...baseParams,
      gitignoreIssue: issue,
    });

    expect(result.gitignoreIssue).toEqual(issue);
  });

  it('adds ok when true', () => {
    const result = compareJsonOutput({
      ...baseParams,
      ok: true,
    });

    expect(result.ok).toBe(true);
  });

  it('does not add ok when false', () => {
    const result = compareJsonOutput({
      ...baseParams,
      ok: false,
    });

    expect(result.ok).toBeUndefined();
  });
});
