import { describe, it, expect } from 'vitest';
import { computeScanStats } from '../../../../src/core/scan/computeScanStats.js';
import type { ScanResult, EnvUsage } from '../../../../src/config/types.js';

const usage = (variable: string): EnvUsage =>
  ({ variable, file: 'a.ts', line: 1, column: 1 }) as EnvUsage;

const baseScanResult = (): ScanResult => ({
  used: [],
  missing: [],
  unused: [],
  secrets: [],
  logged: [],
  duplicates: { env: [], example: [] },
  stats: {
    filesScanned: 7,
    totalUsages: 999,
    uniqueVariables: 999,
    warningsCount: 999,
    duration: 1.5,
  },
});

describe('computeScanStats', () => {
  it('returns zero counts for an empty result and keeps filesScanned and duration', () => {
    expect(computeScanStats(baseScanResult())).toEqual({
      filesScanned: 7,
      totalUsages: 0,
      uniqueVariables: 0,
      warningsCount: 0,
      duration: 1.5,
    });
  });

  it('counts total usages and unique variables', () => {
    const stats = computeScanStats({
      ...baseScanResult(),
      used: [usage('A'), usage('A'), usage('B')],
    });

    expect(stats.totalUsages).toBe(3);
    expect(stats.uniqueVariables).toBe(2);
  });

  it('sums every warning category', () => {
    const stats = computeScanStats({
      ...baseScanResult(),
      missing: ['A'],
      unused: ['B', 'C'],
      logged: [usage('D')],
      duplicates: {
        env: [{ key: 'E', count: 2 }],
        example: [{ key: 'F', count: 2 }],
      },
      frameworkWarnings: [{}, {}] as NonNullable<
        ScanResult['frameworkWarnings']
      >,
      driftWarnings: [{}] as NonNullable<ScanResult['driftWarnings']>,
    });

    expect(stats.warningsCount).toBe(1 + 2 + 1 + 1 + 1 + 2 + 1);
  });

  it('treats undefined optional arrays as zero instead of producing NaN', () => {
    const stats = computeScanStats({
      ...baseScanResult(),
      missing: ['A'],
      logged: undefined as unknown as ScanResult['logged'],
      secrets: undefined as unknown as ScanResult['secrets'],
    });

    expect(stats.warningsCount).toBe(1);
  });

  it('does not mutate the input', () => {
    const input = baseScanResult();
    computeScanStats(input);
    expect(input.stats.totalUsages).toBe(999);
  });
});
