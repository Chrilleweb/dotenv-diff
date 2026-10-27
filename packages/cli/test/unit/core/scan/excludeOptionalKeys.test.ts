import { describe, it, expect } from 'vitest';
import { excludeOptionalKeys } from '../../../../src/core/scan/excludeOptionalKeys.js';
import type { ScanResult } from '../../../../src/config/types.js';

/**
 * Builds a minimal but fully-typed ScanResult, with optional overrides.
 */
function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    used: [],
    missing: [],
    unused: [],
    stats: {
      filesScanned: 0,
      totalUsages: 0,
      uniqueVariables: 0,
      warningsCount: 0,
      duration: 0,
    },
    secrets: [],
    duplicates: {},
    logged: [],
    ...overrides,
  };
}

describe('excludeOptionalKeys', () => {
  it('removes optional keys from missing', () => {
    const scanResult = makeScanResult({ missing: ['DB_URL', 'REDIS_URL'] });
    const result = excludeOptionalKeys(scanResult, new Set(['REDIS_URL']));
    expect(result.missing).toEqual(['DB_URL']);
  });

  it('removes typo suggestions for optional keys', () => {
    const scanResult = makeScanResult({
      missing: ['DB_URL', 'REDIS_URL'],
      suggestions: [
        { key: 'DB_URL', didYouMean: 'DB_URI', distance: 1 },
        { key: 'REDIS_URL', didYouMean: 'REDIS_URI', distance: 1 },
      ],
    });
    const result = excludeOptionalKeys(scanResult, new Set(['REDIS_URL']));
    expect(result.suggestions).toEqual([
      { key: 'DB_URL', didYouMean: 'DB_URI', distance: 1 },
    ]);
  });

  it('leaves suggestions undefined when there were none', () => {
    const scanResult = makeScanResult({ missing: ['REDIS_URL'] });
    const result = excludeOptionalKeys(scanResult, new Set(['REDIS_URL']));
    expect(result.missing).toEqual([]);
    expect(result).not.toHaveProperty('suggestions');
  });

  it('returns the scan result unchanged when no keys are optional', () => {
    const scanResult = makeScanResult({ missing: ['DB_URL'] });
    expect(excludeOptionalKeys(scanResult, new Set())).toBe(scanResult);
  });

  it('does not mutate the input', () => {
    const scanResult = makeScanResult({ missing: ['DB_URL', 'REDIS_URL'] });
    excludeOptionalKeys(scanResult, new Set(['REDIS_URL']));
    expect(scanResult.missing).toEqual(['DB_URL', 'REDIS_URL']);
  });
});
