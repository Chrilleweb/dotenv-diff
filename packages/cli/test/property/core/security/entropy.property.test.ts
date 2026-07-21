import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { shannonEntropyNormalized } from '../../../../src/core/security/entropy.js';

/**
 * Property-based ("fuzz") tests for the normalized Shannon entropy metric.
 *
 * These feed thousands of randomly-generated strings — including control
 * characters, unicode, and pathological shapes — into `shannonEntropyNormalized`
 * to prove it never throws, never produces NaN, and always stays within its
 * documented [0, 1] range. Property-based testing is also what OpenSSF Scorecard
 * recognises as fuzzing for JS/TS.
 */
describe('shannonEntropyNormalized (property-based)', () => {
  test('never throws on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        shannonEntropyNormalized(input);
      }),
      { numRuns: 2000 },
    );
  });

  test('never throws on arbitrary unicode / control chars', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        shannonEntropyNormalized(input);
      }),
      { numRuns: 2000 },
    );
  });

  test('result is always a finite number in [0, 1]', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        const h = shannonEntropyNormalized(input);
        expect(Number.isFinite(h)).toBe(true);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(1);
      }),
      { numRuns: 2000 },
    );
  });

  test('empty string has zero entropy', () => {
    expect(shannonEntropyNormalized('')).toBe(0);
  });

  test('a single repeated character has zero entropy', () => {
    const singleChar = fc
      .integer({ min: 0, max: 0xffff })
      .map((n) => String.fromCharCode(n));
    fc.assert(
      fc.property(singleChar, fc.integer({ min: 1, max: 200 }), (ch, count) => {
        expect(shannonEntropyNormalized(ch.repeat(count))).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  test('entropy is invariant under permutation of characters', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        // Permute at the code-point level (`[...input]`), so we never split or
        // fuse surrogate pairs — that would change the character multiset.
        const original = [...input];
        const shuffled = [...original].reverse().join('');
        expect(shannonEntropyNormalized(shuffled)).toBeCloseTo(
          shannonEntropyNormalized(original.join('')),
          10,
        );
      }),
      { numRuns: 1000 },
    );
  });

  test('n distinct characters each appearing once give log2(n) / log2(72)', () => {
    fc.assert(
      fc.property(
        // Distinct full code points, including astral (surrogate-pair) chars —
        // this is what regressed before the code-point-length fix.
        fc.uniqueArray(
          fc
            .integer({ min: 0, max: 0x10ffff })
            .filter((n) => n < 0xd800 || n > 0xdfff)
            .map((n) => String.fromCodePoint(n)),
          { minLength: 1, maxLength: 72 },
        ),
        (chars) => {
          const h = shannonEntropyNormalized(chars.join(''));
          const expected = Math.min(1, Math.log2(chars.length) / Math.log2(72));
          expect(h).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
