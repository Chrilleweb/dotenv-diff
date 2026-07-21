import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { levenshtein } from '../../../../src/core/helpers/levenshtein.js';

/**
 * Property-based ("fuzz") tests for the Levenshtein edit-distance metric.
 *
 * These feed thousands of randomly-generated string pairs — including control
 * characters, unicode, and pathological shapes — into `levenshtein` to prove it
 * never throws and always upholds the mathematical properties of a distance
 * metric (non-negativity, identity, symmetry, the triangle inequality, and the
 * length bounds). Property-based testing is also what OpenSSF Scorecard
 * recognises as fuzzing for JS/TS.
 *
 * Note: `levenshtein` operates on UTF-16 code units, so all length-based
 * invariants below use `.length` (the code-unit count), which matches the
 * implementation.
 */
describe('levenshtein (property-based)', () => {
  // Exactly one UTF-16 code unit (fast-check's 'binary' unit yields whole code
  // points, which can be surrogate pairs, i.e. two code units) — used to make
  // edits that change the code-unit length by exactly one.
  const codeUnit = fc
    .integer({ min: 0, max: 0xffff })
    .map((n) => String.fromCharCode(n));

  test('never throws on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        levenshtein(a, b);
      }),
      { numRuns: 2000 },
    );
  });

  test('never throws on arbitrary unicode / control chars', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'binary' }),
        fc.string({ unit: 'binary' }),
        (a, b) => {
          levenshtein(a, b);
        },
      ),
      { numRuns: 2000 },
    );
  });

  test('result is always a non-negative integer', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const d = levenshtein(a, b);
        expect(Number.isInteger(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 2000 },
    );
  });

  test('identity: distance to itself is zero', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (a) => {
        expect(levenshtein(a, a)).toBe(0);
      }),
      { numRuns: 2000 },
    );
  });

  test('identity of indiscernibles: distance is 0 iff the strings are equal', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(levenshtein(a, b) === 0).toBe(a === b);
      }),
      { numRuns: 2000 },
    );
  });

  test('symmetry: d(a, b) === d(b, a)', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(levenshtein(a, b)).toBe(levenshtein(b, a));
      }),
      { numRuns: 2000 },
    );
  });

  test('length bounds: |len(a) - len(b)| <= d <= max(len(a), len(b))', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const d = levenshtein(a, b);
        expect(d).toBeGreaterThanOrEqual(Math.abs(a.length - b.length));
        expect(d).toBeLessThanOrEqual(Math.max(a.length, b.length));
      }),
      { numRuns: 2000 },
    );
  });

  test('triangle inequality: d(a, c) <= d(a, b) + d(b, c)', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
        expect(levenshtein(a, c)).toBeLessThanOrEqual(
          levenshtein(a, b) + levenshtein(b, c),
        );
      }),
      { numRuns: 2000 },
    );
  });

  test('appending a single code unit increases the distance by exactly one', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), codeUnit, (a, c) => {
        expect(levenshtein(a, a + c)).toBe(1);
      }),
      { numRuns: 2000 },
    );
  });
});
