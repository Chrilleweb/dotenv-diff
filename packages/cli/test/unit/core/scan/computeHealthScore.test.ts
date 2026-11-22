import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../../../../src/core/scan/computeHealthScore.js';
import type { FrameworkWarning } from '../../../../src/config/types.js';
import type { SecretFinding } from '../../../../src/core/security/secretDetectors.js';
import { makeScanResult } from '../../../utils/scan-helpers.js';

describe('computeHealthScore', () => {
  it('returns 100 for a clean scan', () => {
    const score = computeHealthScore(
      makeScanResult({
        missing: [],
        unused: [],
      }),
    );

    expect(score).toBe(100);
  });

  it('penalizes high severity secrets heavily', () => {
    const score = computeHealthScore(
      makeScanResult({
        missing: [],
        secrets: [{ severity: 'high' } as SecretFinding],
      }),
    );

    expect(score).toBe(80);
  });

  it('penalizes missing variables', () => {
    const score = computeHealthScore(
      makeScanResult({
        missing: ['API_KEY'],
      }),
    );

    expect(score).toBe(80);
  });

  it('combines multiple penalties', () => {
    const score = computeHealthScore(
      makeScanResult({
        missing: ['A'],
        unused: ['B', 'C'],
        frameworkWarnings: [{} as FrameworkWarning],
      }),
    );

    // 100 - 20 (missing) - 2 (unused x2) - 5 (framework)
    expect(score).toBe(73);
  });

  it('never returns a negative score', () => {
    const score = computeHealthScore(
      makeScanResult({
        missing: Array(10).fill('A'),
        secrets: Array(10).fill({ severity: 'high' } as SecretFinding),
      }),
    );

    expect(score).toBe(0);
  });
});
