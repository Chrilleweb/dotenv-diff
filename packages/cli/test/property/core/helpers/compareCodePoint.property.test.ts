import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { compareCodePoint } from '../../../../src/core/helpers/compareCodePoint.js';

/**
 * Property-based ("fuzz") tests for the deterministic string comparator.
 *
 * These feed thousands of randomly-generated string pairs and triples —
 * including control characters, unicode, and pathological shapes — into
 * `compareCodePoint` to prove it never throws and always behaves as a valid
 * total-order comparator: it returns only -1/0/1, is reflexive, antisymmetric,
 * transitive, and safe to hand to `Array.prototype.sort`. Property-based testing
 * is also what OpenSSF Scorecard recognises as fuzzing for JS/TS.
 */
describe('compareCodePoint (property-based)', () => {
  const str = fc.string({ unit: 'binary' });

  test('never throws on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        compareCodePoint(a, b);
      }),
      { numRuns: 2000 },
    );
  });

  test('returns only -1, 0, or 1', () => {
    fc.assert(
      fc.property(str, str, (a, b) => {
        expect([-1, 0, 1]).toContain(compareCodePoint(a, b));
      }),
      { numRuns: 2000 },
    );
  });

  test('reflexive: comparing a string to itself is 0', () => {
    fc.assert(
      fc.property(str, (a) => {
        expect(compareCodePoint(a, a)).toBe(0);
      }),
      { numRuns: 2000 },
    );
  });

  test('returns 0 iff the strings are equal', () => {
    fc.assert(
      fc.property(str, str, (a, b) => {
        expect(compareCodePoint(a, b) === 0).toBe(a === b);
      }),
      { numRuns: 2000 },
    );
  });

  test('antisymmetric: cmp(a, b) === -cmp(b, a)', () => {
    fc.assert(
      fc.property(str, str, (a, b) => {
        const backward = compareCodePoint(b, a);
        // Guard against -0: negating 0 yields -0, which `toBe` (Object.is)
        // treats as distinct from 0.
        expect(compareCodePoint(a, b)).toBe(backward === 0 ? 0 : -backward);
      }),
      { numRuns: 2000 },
    );
  });

  test('consistent with the < and > operators', () => {
    fc.assert(
      fc.property(str, str, (a, b) => {
        const expected = a < b ? -1 : a > b ? 1 : 0;
        expect(compareCodePoint(a, b)).toBe(expected);
      }),
      { numRuns: 2000 },
    );
  });

  test('transitive: a <= b and b <= c implies a <= c', () => {
    fc.assert(
      fc.property(str, str, str, (a, b, c) => {
        const ab = compareCodePoint(a, b);
        const bc = compareCodePoint(b, c);
        if (ab <= 0 && bc <= 0) {
          expect(compareCodePoint(a, c)).toBeLessThanOrEqual(0);
        }
        if (ab >= 0 && bc >= 0) {
          expect(compareCodePoint(a, c)).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 5000 },
    );
  });

  test('is a valid Array.sort comparator: sorts into a total order and preserves the multiset', () => {
    fc.assert(
      fc.property(fc.array(str, { maxLength: 50 }), (items) => {
        const sorted = [...items].sort(compareCodePoint);
        // Same elements, just reordered.
        expect([...sorted].sort()).toEqual([...items].sort());
        // Every adjacent pair is correctly ordered.
        for (let i = 1; i < sorted.length; i++) {
          expect(
            compareCodePoint(sorted[i - 1]!, sorted[i]!),
          ).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 1000 },
    );
  });
});
