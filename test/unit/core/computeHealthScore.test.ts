import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../../../src/core/computeHealthScore.js';

describe('computeHealthScore', () => {
  it('returns 100 for a clean scan', () => {
    const score = computeHealthScore({
      missing: [],
      unused: [],
    } as any);

    expect(score).toBe(100);
  });

  it('penalizes high severity secrets heavily', () => {
    const score = computeHealthScore({
      missing: [],
      secrets: [{ severity: 'high' }],
    } as any);

    expect(score).toBe(80);
  });

  it('penalizes missing variables', () => {
    const score = computeHealthScore({
      missing: ['API_KEY'],
    } as any);

    expect(score).toBe(80);
  });

  it('combines multiple penalties', () => {
    const score = computeHealthScore({
      missing: ['A'],
      unused: ['B', 'C'],
      frameworkWarnings: [{}],
    } as any);

    // 100 - 20 (missing) - 2 (unused x2) - 5 (framework)
    expect(score).toBe(73);
  });

  it('never returns a negative score', () => {
    const score = computeHealthScore({
      missing: Array(10).fill('A'),
      secrets: Array(10).fill({ severity: 'high' }),
    } as any);

    expect(score).toBe(0);
  });
});
