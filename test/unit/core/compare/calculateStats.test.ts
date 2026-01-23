import { describe, it, expect } from 'vitest';
import { calculateStats } from '../../../../src/core/compare/calculateStats.js';

describe('calculateStats', () => {
  it('calculates counts correctly without duplicates', () => {
    const stats = calculateStats(
      ['A', 'B', 'C'],
      ['A', 'B'],
      [],
      [],
      { mismatches: [] } as any,
      false,
    );

    expect(stats).toEqual({
      envCount: 3,
      exampleCount: 2,
      sharedCount: 2,
      duplicateCount: 0,
      valueMismatchCount: 0,
    });
  });

  it('counts duplicates as (count - 1)', () => {
    const stats = calculateStats(
      ['A'],
      ['A'],
      [{ key: 'A', count: 3 }],
      [{ key: 'A', count: 2 }],
      { mismatches: [] } as any,
      false,
    );

    expect(stats.duplicateCount).toBe(3); // (3-1) + (2-1)
  });

  it('counts value mismatches when enabled', () => {
    const stats = calculateStats(
      ['A'],
      ['A'],
      [],
      [],
      {
        mismatches: [
          { key: 'A', expected: 'x', actual: 'y' },
          { key: 'B', expected: 'x', actual: 'y' },
        ],
      } as any,
      true,
    );

    expect(stats.valueMismatchCount).toBe(2);
  });

  it('returns 0 valueMismatchCount when checkValues is true but mismatches is undefined', () => {
    const stats = calculateStats(
      ['A'],
      ['A'],
      [],
      [],
      {} as any, // mismatches is undefined
      true,
    );

    expect(stats.valueMismatchCount).toBe(0);
  });
});
