import { describe, it, expect } from 'vitest';
import { compareWithEnvFiles } from '../../../../src/core/scan/compareScan.js';

describe('compareWithEnvFiles', () => {
  it('detects missing variables', () => {
    const result = compareWithEnvFiles(
      {
        used: [{ variable: 'API_KEY' }],
        missing: [],
        unused: [],
      } as any,
      {},
    );

    expect(result.missing).toEqual(['API_KEY']);
    expect(result.unused).toEqual([]);
  });

  it('detects unused variables', () => {
    const result = compareWithEnvFiles(
      {
        used: [],
        missing: [],
        unused: [],
      } as any,
      { API_KEY: '123' },
    );

    expect(result.missing).toEqual([]);
    expect(result.unused).toEqual(['API_KEY']);
  });

  it('detects both missing and unused variables', () => {
    const result = compareWithEnvFiles(
      {
        used: [{ variable: 'A' }],
        missing: [],
        unused: [],
      } as any,
      { B: 'x' },
    );

    expect(result.missing).toEqual(['A']);
    expect(result.unused).toEqual(['B']);
  });

  it('preserves other ScanResult fields', () => {
    const scanResult = {
      used: [],
      stats: { filesScanned: 1 },
    } as any;

    const result = compareWithEnvFiles(scanResult, {});

    expect(result.stats).toEqual(scanResult.stats);
  });
});
