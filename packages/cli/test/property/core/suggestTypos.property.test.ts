import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { suggestTypos } from '../../../src/core/suggestTypos.js';
import { levenshtein } from '../../../src/core/helpers/levenshtein.js';
import {
  MAX_TYPO_DISTANCE,
  MAX_TYPO_RATIO,
} from '../../../src/config/constants.js';

/**
 * Property-based ("fuzz") tests for the "did you mean …?" typo suggester.
 *
 * These feed thousands of randomly-generated reported/candidate key lists —
 * including near-duplicates that should match and unrelated noise that should
 * not — into `suggestTypos` to prove it never throws and always returns
 * well-formed suggestions: one per matching reported key, pointing at an actual
 * candidate within the distance and length-ratio thresholds, and always the
 * closest such candidate. Property-based testing is also what OpenSSF Scorecard
 * recognises as fuzzing for JS/TS.
 */
describe('suggestTypos (property-based)', () => {
  // Identifier-shaped keys from a small alphabet so near-typos arise naturally.
  const identChar = fc.constantFrom(
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split(''),
  );
  const ident = fc
    .array(identChar, { minLength: 3, maxLength: 12 })
    .map((a) => a.join(''));
  const keyList = fc.array(ident, { maxLength: 15 });

  // The spec of "is this candidate a likely typo of key", per the constants.
  const qualifies = (key: string, cand: string): boolean => {
    if (cand === key) return false;
    const d = levenshtein(key, cand);
    if (d === 0 || d > MAX_TYPO_DISTANCE) return false;
    return d / Math.max(key.length, cand.length) <= MAX_TYPO_RATIO;
  };

  const isSubsequence = (sub: string[], sup: string[]): boolean => {
    let i = 0;
    for (const x of sup) if (i < sub.length && sub[i] === x) i++;
    return i === sub.length;
  };

  test('never throws on arbitrary string arrays', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string()),
        fc.array(fc.string()),
        (reported, candidates) => {
          suggestTypos(reported, candidates);
        },
      ),
      { numRuns: 2000 },
    );
  });

  test('returns [] when either list is empty', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (list) => {
        expect(suggestTypos(list, [])).toEqual([]);
        expect(suggestTypos([], list)).toEqual([]);
      }),
      { numRuns: 1000 },
    );
  });

  test('every suggestion is well-formed and within the thresholds', () => {
    fc.assert(
      fc.property(keyList, keyList, (reported, candidates) => {
        for (const s of suggestTypos(reported, candidates)) {
          expect(reported).toContain(s.key);
          expect(candidates).toContain(s.didYouMean);
          expect(s.didYouMean).not.toBe(s.key);
          expect(s.distance).toBe(levenshtein(s.key, s.didYouMean));
          expect(s.distance).toBeGreaterThanOrEqual(1);
          expect(s.distance).toBeLessThanOrEqual(MAX_TYPO_DISTANCE);
          const longest = Math.max(s.key.length, s.didYouMean.length);
          expect(s.distance / longest).toBeLessThanOrEqual(MAX_TYPO_RATIO);
        }
      }),
      { numRuns: 3000 },
    );
  });

  test('didYouMean is always the closest qualifying candidate', () => {
    fc.assert(
      fc.property(keyList, keyList, (reported, candidates) => {
        for (const s of suggestTypos(reported, candidates)) {
          // No qualifying candidate is strictly closer than the one chosen.
          for (const c of candidates) {
            if (qualifies(s.key, c)) {
              expect(s.distance).toBeLessThanOrEqual(levenshtein(s.key, c));
            }
          }
        }
      }),
      { numRuns: 3000 },
    );
  });

  test('produces exactly one suggestion per reported key that has a match, in order', () => {
    fc.assert(
      fc.property(keyList, keyList, (reported, candidates) => {
        const result = suggestTypos(reported, candidates);
        const expectedKeys = reported.filter((k) =>
          candidates.some((c) => qualifies(k, c)),
        );
        expect(result.map((s) => s.key)).toEqual(expectedKeys);
        // Consequently the suggestion keys are a subsequence of reported.
        expect(
          isSubsequence(
            result.map((s) => s.key),
            reported,
          ),
        ).toBe(true);
      }),
      { numRuns: 3000 },
    );
  });

  test('is deterministic', () => {
    fc.assert(
      fc.property(keyList, keyList, (reported, candidates) => {
        expect(suggestTypos(reported, candidates)).toEqual(
          suggestTypos(reported, candidates),
        );
      }),
      { numRuns: 1000 },
    );
  });

  test('a key identical to a candidate is never suggested against itself', () => {
    fc.assert(
      fc.property(ident, keyList, (key, others) => {
        // `key` is present in both lists; it must not suggest itself.
        const result = suggestTypos([key], [key, ...others]);
        for (const s of result) {
          expect(s.didYouMean).not.toBe(key);
        }
      }),
      { numRuns: 2000 },
    );
  });
});
