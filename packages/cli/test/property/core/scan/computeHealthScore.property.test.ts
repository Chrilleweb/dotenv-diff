import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import type { ScanResult } from '../../../../src/config/types.js';
import { computeHealthScore } from '../../../../src/core/scan/computeHealthScore.js';

/**
 * Property-based ("fuzz") tests for the scan health score.
 *
 * The score starts at 100 and subtracts a fixed weight per issue in each
 * category, then clamps to [0, 100]. These generate thousands of random issue
 * count combinations to prove the score is always an integer inside [0, 100], a
 * fully clean scan scores 100, more issues never raise the score (monotonic),
 * only high/medium secrets are penalised, and the total matches the documented
 * per-category weights. Property-based testing is also what OpenSSF Scorecard
 * recognises as fuzzing for JS/TS.
 */

interface Counts {
  highSecrets: number;
  medSecrets: number;
  lowSecrets: number;
  missing: number;
  uppercase: number;
  logged: number;
  unused: number;
  framework: number;
  example: number;
  expire: number;
  inconsistent: number;
  dupEnv: number;
  dupExample: number;
}

const fill = (n: number) => Array.from({ length: n }, () => ({}));

/** Build a minimal ScanResult carrying exactly the requested issue counts. */
function buildScan(c: Counts): ScanResult {
  return {
    missing: fill(c.missing),
    unused: fill(c.unused),
    logged: fill(c.logged),
    uppercaseWarnings: fill(c.uppercase),
    frameworkWarnings: fill(c.framework),
    exampleWarnings: fill(c.example),
    expireWarnings: fill(c.expire),
    inconsistentNamingWarnings: fill(c.inconsistent),
    secrets: [
      ...Array.from({ length: c.highSecrets }, () => ({ severity: 'high' })),
      ...Array.from({ length: c.medSecrets }, () => ({ severity: 'medium' })),
      ...Array.from({ length: c.lowSecrets }, () => ({ severity: 'low' })),
    ],
    duplicates: { env: fill(c.dupEnv), example: fill(c.dupExample) },
  } as unknown as ScanResult;
}

/** Independent re-derivation of the documented weighting. */
function expectedScore(c: Counts): number {
  const raw =
    100 -
    c.highSecrets * 20 -
    c.medSecrets * 10 -
    c.missing * 20 -
    c.uppercase * 2 -
    c.logged * 10 -
    c.unused * 1 -
    c.framework * 5 -
    c.example * 10 -
    c.expire * 5 -
    c.inconsistent * 3 -
    c.dupEnv * 10 -
    c.dupExample * 10;
  return Math.max(0, Math.min(100, raw));
}

const countsArb: fc.Arbitrary<Counts> = fc.record({
  highSecrets: fc.nat({ max: 8 }),
  medSecrets: fc.nat({ max: 8 }),
  lowSecrets: fc.nat({ max: 8 }),
  missing: fc.nat({ max: 8 }),
  uppercase: fc.nat({ max: 8 }),
  logged: fc.nat({ max: 8 }),
  unused: fc.nat({ max: 8 }),
  framework: fc.nat({ max: 8 }),
  example: fc.nat({ max: 8 }),
  expire: fc.nat({ max: 8 }),
  inconsistent: fc.nat({ max: 8 }),
  dupEnv: fc.nat({ max: 8 }),
  dupExample: fc.nat({ max: 8 }),
});

describe('computeHealthScore (property-based)', () => {
  test('result is always an integer in [0, 100]', () => {
    fc.assert(
      fc.property(countsArb, (c) => {
        const score = computeHealthScore(buildScan(c));
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }),
      { numRuns: 5000 },
    );
  });

  test('matches the documented per-category weighting', () => {
    fc.assert(
      fc.property(countsArb, (c) => {
        expect(computeHealthScore(buildScan(c))).toBe(expectedScore(c));
      }),
      { numRuns: 5000 },
    );
  });

  test('a fully clean scan scores 100', () => {
    const clean: Counts = {
      highSecrets: 0,
      medSecrets: 0,
      lowSecrets: 0,
      missing: 0,
      uppercase: 0,
      logged: 0,
      unused: 0,
      framework: 0,
      example: 0,
      expire: 0,
      inconsistent: 0,
      dupEnv: 0,
      dupExample: 0,
    };
    expect(computeHealthScore(buildScan(clean))).toBe(100);
  });

  test('monotonic: adding issues never raises the score', () => {
    const nonNeg = fc.record({
      highSecrets: fc.nat({ max: 5 }),
      medSecrets: fc.nat({ max: 5 }),
      lowSecrets: fc.nat({ max: 5 }),
      missing: fc.nat({ max: 5 }),
      uppercase: fc.nat({ max: 5 }),
      logged: fc.nat({ max: 5 }),
      unused: fc.nat({ max: 5 }),
      framework: fc.nat({ max: 5 }),
      example: fc.nat({ max: 5 }),
      expire: fc.nat({ max: 5 }),
      inconsistent: fc.nat({ max: 5 }),
      dupEnv: fc.nat({ max: 5 }),
      dupExample: fc.nat({ max: 5 }),
    });
    fc.assert(
      fc.property(countsArb, nonNeg, (base, extra) => {
        const bigger: Counts = { ...base };
        for (const k of Object.keys(base) as (keyof Counts)[]) {
          bigger[k] = base[k] + extra[k];
        }
        expect(computeHealthScore(buildScan(bigger))).toBeLessThanOrEqual(
          computeHealthScore(buildScan(base)),
        );
      }),
      { numRuns: 5000 },
    );
  });

  test('low-severity secrets do not affect the score', () => {
    fc.assert(
      fc.property(countsArb, fc.nat({ max: 20 }), (c, extraLow) => {
        const withLow: Counts = { ...c, lowSecrets: c.lowSecrets + extraLow };
        expect(computeHealthScore(buildScan(withLow))).toBe(
          computeHealthScore(buildScan(c)),
        );
      }),
      { numRuns: 3000 },
    );
  });

  test('never throws when optional fields are absent', () => {
    // Only the non-optional `missing` array is guaranteed present in the type.
    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 30 }), (missing) => {
        const score = computeHealthScore({ missing } as unknown as ScanResult);
        expect(score).toBe(Math.max(0, 100 - missing.length * 20));
      }),
      { numRuns: 2000 },
    );
  });
});
