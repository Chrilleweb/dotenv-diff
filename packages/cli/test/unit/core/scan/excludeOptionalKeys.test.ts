import { describe, it, expect } from 'vitest';
import { excludeOptionalKeys } from '../../../../src/core/scan/excludeOptionalKeys.js';
import { makeScanResult } from '../../../utils/scan-helpers.js';

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

  it('keeps suggestions empty when there were none', () => {
    const scanResult = makeScanResult({ missing: ['REDIS_URL'] });
    const result = excludeOptionalKeys(scanResult, new Set(['REDIS_URL']));
    expect(result.missing).toEqual([]);
    expect(result.suggestions).toEqual([]);
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
