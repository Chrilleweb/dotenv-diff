import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { detectInconsistentNaming } from '../../../src/core/detectInconsistentNaming.js';

/**
 * Property-based ("fuzz") tests for the inconsistent-naming detector.
 *
 * Two keys are "inconsistently named" when they are equal after lower-casing and
 * stripping underscores, yet not identical (e.g. `API_KEY` vs `APIKEY`). These
 * tests throw thousands of random key sets at the detector — heavy on the
 * characters that create near-collisions (case, underscores, and the `|`
 * separator the dedup key is built from) — to prove it never throws, only
 * reports genuine inconsistencies (soundness), reports every one of them
 * (completeness), and does not depend on the order the keys arrive in.
 * Property-based testing is also what OpenSSF Scorecard recognises as fuzzing
 * for JS/TS.
 */

/** Reference normalizer: the exact notion of "same key" the detector uses. */
const norm = (k: string) => k.toLowerCase().replace(/_/g, '');

/** Stable, collision-free key for an unordered pair of strings. */
const pairId = (a: string, b: string) => JSON.stringify([a, b].sort());

/**
 * Keys drawn from a tiny alphabet on purpose: short strings over {a,A,_,|}
 * maximise both genuine inconsistencies and delimiter collisions in the dedup
 * key (`|` is the separator a naive `join('|')` would have used).
 */
const trickyKey = fc.stringMatching(/^[aA_|]{0,8}$/);

/** A more realistic env-style key generator. */
const envKey = fc.stringMatching(/^[A-Za-z][A-Za-z0-9_]{0,10}$/);

// Weight heavily toward the tricky alphabet so collisions are actually hit.
const keyArb = fc.oneof(
  { weight: 4, arbitrary: trickyKey },
  { weight: 1, arbitrary: envKey },
);

/** All genuinely-inconsistent unordered pairs among the distinct input keys. */
function expectedPairs(keys: string[]): Set<string> {
  const uniq = [...new Set(keys.filter((k) => k))];
  const pairs = new Set<string>();
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const a = uniq[i]!;
      const b = uniq[j]!;
      if (a !== b && norm(a) === norm(b)) pairs.add(pairId(a, b));
    }
  }
  return pairs;
}

describe('detectInconsistentNaming (property-based)', () => {
  test('never throws on arbitrary key arrays', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ unit: 'binary' })), (keys) => {
        detectInconsistentNaming(keys);
      }),
      { numRuns: 2000 },
    );
  });

  test('soundness: every warning is a genuine, distinct inconsistency', () => {
    fc.assert(
      fc.property(fc.array(keyArb, { maxLength: 12 }), (keys) => {
        const set = new Set(keys.filter((k) => k));
        for (const w of detectInconsistentNaming(keys)) {
          expect(w.key1).not.toBe(w.key2);
          expect(norm(w.key1)).toBe(norm(w.key2));
          expect(set.has(w.key1)).toBe(true);
          expect(set.has(w.key2)).toBe(true);
        }
      }),
      { numRuns: 3000 },
    );
  });

  test('completeness: every distinct inconsistent pair is reported exactly once', () => {
    fc.assert(
      fc.property(fc.array(keyArb, { maxLength: 12 }), (keys) => {
        const out = detectInconsistentNaming(keys);
        const reported = out.map((w) => pairId(w.key1, w.key2));
        // No duplicate unordered pairs.
        expect(new Set(reported).size).toBe(reported.length);
        // Reported set equals the expected set.
        expect(new Set(reported)).toEqual(expectedPairs(keys));
      }),
      { numRuns: 15000 },
    );
  });

  test('order-independence: the set of reported pairs ignores input order', () => {
    fc.assert(
      fc.property(
        fc.array(keyArb, { maxLength: 12 }),
        fc.array(fc.integer()),
        (keys, seed) => {
          // Deterministic shuffle driven by the generated seed array.
          const shuffled = keys
            .map((k, i) => ({ k, s: seed[i] ?? i }))
            .sort((a, b) => a.s - b.s)
            .map((x) => x.k);
          const a = new Set(
            detectInconsistentNaming(keys).map((w) => pairId(w.key1, w.key2)),
          );
          const b = new Set(
            detectInconsistentNaming(shuffled).map((w) =>
              pairId(w.key1, w.key2),
            ),
          );
          expect(b).toEqual(a);
        },
      ),
      { numRuns: 15000 },
    );
  });

  test('suggestion is always one of the two keys, and the underscored one when unambiguous', () => {
    fc.assert(
      fc.property(fc.array(keyArb, { maxLength: 12 }), (keys) => {
        for (const w of detectInconsistentNaming(keys)) {
          expect([w.key1, w.key2]).toContain(w.suggestion);
          const has1 = w.key1.includes('_');
          const has2 = w.key2.includes('_');
          if (has1 !== has2) {
            // Exactly one side is snake_case → that side must be suggested.
            expect(w.suggestion.includes('_')).toBe(true);
          }
        }
      }),
      { numRuns: 3000 },
    );
  });
});
