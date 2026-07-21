import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  filterIgnoredKeys,
  DEFAULT_EXCLUDE_KEYS,
  DEFAULT_EXCLUDE_REGEX,
} from '../../../../src/core/helpers/filterIgnoredKeys.js';

/**
 * Property-based ("fuzz") tests for the ignore-key filter.
 *
 * These feed thousands of randomly-generated key lists, ignore lists, and
 * regex patterns — with keys deliberately overlapping the built-in excludes and
 * CI prefixes — into `filterIgnoredKeys` to prove it never throws and always
 * behaves as a sound, complete, order-preserving subset filter. Property-based
 * testing is also what OpenSSF Scorecard recognises as fuzzing for JS/TS.
 */
describe('filterIgnoredKeys (property-based)', () => {
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Keys that overlap the built-in excludes, CI prefixes, and arbitrary noise.
  const key = fc.oneof(
    fc.constantFrom(...DEFAULT_EXCLUDE_KEYS),
    fc.constantFrom(
      'GITHUB_SHA',
      'RUNNER_OS',
      'VERCEL_ENV',
      'CI_COMMIT_SHA',
      'CIRCLE_BRANCH',
    ),
    fc.constantFrom('MY_KEY', 'API_TOKEN', 'DATABASE_URL', 'SECRET'),
    fc.string(),
  );
  const keys = fc.array(key, { maxLength: 30 });
  const ignore = fc.array(key, { maxLength: 10 });
  // Flag-less regexes only — that's what parseRegexList always produces via
  // `new RegExp(pattern)`, so a stateful global-flag regex never reaches here.
  const ignoreRegex = fc.array(
    fc.string({ maxLength: 6 }).map((s) => new RegExp(escapeRegExp(s))),
    { maxLength: 5 },
  );

  const isRemoved = (k: string, ig: string[], igRx: RegExp[]): boolean =>
    ig.includes(k) ||
    DEFAULT_EXCLUDE_KEYS.includes(k) ||
    DEFAULT_EXCLUDE_REGEX.some((rx) => rx.test(k)) ||
    igRx.some((rx) => rx.test(k));

  const isSubsequence = (sub: string[], sup: string[]): boolean => {
    let i = 0;
    for (const x of sup) if (i < sub.length && sub[i] === x) i++;
    return i === sub.length;
  };

  test('never throws', () => {
    fc.assert(
      fc.property(keys, ignore, ignoreRegex, (k, ig, rx) => {
        filterIgnoredKeys(k, ig, rx);
      }),
      { numRuns: 3000 },
    );
  });

  test('result is an order-preserving subsequence of the input', () => {
    fc.assert(
      fc.property(keys, ignore, ignoreRegex, (k, ig, rx) => {
        const result = filterIgnoredKeys(k, ig, rx);
        expect(isSubsequence(result, k)).toBe(true);
      }),
      { numRuns: 2000 },
    );
  });

  test('soundness: every surviving key passes all four filters', () => {
    fc.assert(
      fc.property(keys, ignore, ignoreRegex, (k, ig, rx) => {
        for (const survivor of filterIgnoredKeys(k, ig, rx)) {
          expect(isRemoved(survivor, ig, rx)).toBe(false);
        }
      }),
      { numRuns: 2000 },
    );
  });

  test('completeness: every dropped key fails at least one filter', () => {
    fc.assert(
      fc.property(keys, ignore, ignoreRegex, (k, ig, rx) => {
        const result = filterIgnoredKeys(k, ig, rx);
        // Reconstruct what should remain and compare exactly.
        const expected = k.filter((key) => !isRemoved(key, ig, rx));
        expect(result).toEqual(expected);
      }),
      { numRuns: 2000 },
    );
  });

  test('keys in the ignore list never survive', () => {
    fc.assert(
      fc.property(keys, ignore, ignoreRegex, (k, ig, rx) => {
        const result = filterIgnoredKeys(k, ig, rx);
        for (const ignored of ig) {
          expect(result).not.toContain(ignored);
        }
      }),
      { numRuns: 2000 },
    );
  });

  test('built-in excluded keys and GITHUB_/RUNNER_ prefixes never survive', () => {
    fc.assert(
      fc.property(keys, ignore, ignoreRegex, (k, ig, rx) => {
        const result = filterIgnoredKeys(k, ig, rx);
        for (const survivor of result) {
          expect(DEFAULT_EXCLUDE_KEYS).not.toContain(survivor);
          expect(/^GITHUB_/.test(survivor)).toBe(false);
          expect(/^RUNNER_/.test(survivor)).toBe(false);
        }
      }),
      { numRuns: 2000 },
    );
  });

  test('is idempotent', () => {
    fc.assert(
      fc.property(keys, ignore, ignoreRegex, (k, ig, rx) => {
        const once = filterIgnoredKeys(k, ig, rx);
        const twice = filterIgnoredKeys(once, ig, rx);
        expect(twice).toEqual(once);
      }),
      { numRuns: 2000 },
    );
  });

  test('empty input yields empty output', () => {
    fc.assert(
      fc.property(ignore, ignoreRegex, (ig, rx) => {
        expect(filterIgnoredKeys([], ig, rx)).toEqual([]);
      }),
      { numRuns: 500 },
    );
  });
});
