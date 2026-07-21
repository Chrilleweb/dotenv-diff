import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { diffEnv } from '../../../src/core/diffEnv.js';

/**
 * Property-based ("fuzz") tests for the .env diffing logic.
 *
 * These feed thousands of randomly-generated key/value record pairs — with
 * overlapping keys, empty values, unicode, and dangerous keys like `__proto__`
 * — into `diffEnv` to prove it never throws and always upholds its set-diff
 * invariants: `missing`/`extra` partition the keys correctly and are disjoint,
 * and `valueMismatches` only ever reports genuinely-differing shared keys.
 * Property-based testing is also what OpenSSF Scorecard recognises as fuzzing
 * for JS/TS.
 */
describe('diffEnv (property-based)', () => {
  // Keys drawn from a small pool so `current` and `example` overlap often,
  // mixed with arbitrary strings (including dangerous prototype keys).
  const key = fc.oneof(
    fc.constantFrom('A', 'B', 'C', 'D', 'E'),
    fc.constantFrom('__proto__', 'constructor', 'toString'),
    fc.string(),
  );
  const record = fc.dictionary(key, fc.string(), { maxKeys: 20 });

  const keysOf = (o: Record<string, string>) => Object.keys(o);

  test('never throws on arbitrary records', () => {
    fc.assert(
      fc.property(record, record, fc.boolean(), (current, example, check) => {
        diffEnv(current, example, check);
      }),
      { numRuns: 3000 },
    );
  });

  test('missing = exampleKeys \\ currentKeys, exactly', () => {
    fc.assert(
      fc.property(record, record, (current, example) => {
        const { missing } = diffEnv(current, example);
        const currentKeys = keysOf(current);
        const exampleKeys = keysOf(example);
        // Soundness: every reported key is in example and absent from current.
        for (const k of missing) {
          expect(exampleKeys).toContain(k);
          expect(currentKeys).not.toContain(k);
        }
        // Completeness: nothing that should be missing is left out.
        const expected = exampleKeys.filter((k) => !currentKeys.includes(k));
        expect(missing).toEqual(expected);
      }),
      { numRuns: 2000 },
    );
  });

  test('extra = currentKeys \\ exampleKeys, exactly', () => {
    fc.assert(
      fc.property(record, record, (current, example) => {
        const { extra } = diffEnv(current, example);
        const currentKeys = keysOf(current);
        const exampleKeys = keysOf(example);
        for (const k of extra) {
          expect(currentKeys).toContain(k);
          expect(exampleKeys).not.toContain(k);
        }
        const expected = currentKeys.filter((k) => !exampleKeys.includes(k));
        expect(extra).toEqual(expected);
      }),
      { numRuns: 2000 },
    );
  });

  test('missing and extra are always disjoint', () => {
    fc.assert(
      fc.property(record, record, (current, example) => {
        const { missing, extra } = diffEnv(current, example);
        const overlap = missing.filter((k) => extra.includes(k));
        expect(overlap).toEqual([]);
      }),
      { numRuns: 2000 },
    );
  });

  test('valueMismatches is empty when checkValues is false', () => {
    fc.assert(
      fc.property(record, record, (current, example) => {
        expect(diffEnv(current, example, false).valueMismatches).toEqual([]);
        // Default argument also disables value checking.
        expect(diffEnv(current, example).valueMismatches).toEqual([]);
      }),
      { numRuns: 2000 },
    );
  });

  test('valueMismatches reports exactly the shared keys with a non-empty, differing example value', () => {
    fc.assert(
      fc.property(record, record, (current, example) => {
        const { valueMismatches } = diffEnv(current, example, true);
        const currentKeys = keysOf(current);
        const exampleKeys = keysOf(example);

        for (const m of valueMismatches) {
          expect(currentKeys).toContain(m.key);
          expect(exampleKeys).toContain(m.key);
          expect(m.expected).toBe(example[m.key]);
          expect(m.actual).toBe(current[m.key]);
          expect(m.expected.trim()).not.toBe('');
          expect(m.actual).not.toBe(m.expected);
        }

        const expectedKeys = exampleKeys.filter(
          (k) =>
            currentKeys.includes(k) &&
            example[k]!.trim() !== '' &&
            current[k] !== example[k],
        );
        expect(valueMismatches.map((m) => m.key)).toEqual(expectedKeys);
      }),
      { numRuns: 2000 },
    );
  });

  test('comparing a record with itself yields no differences', () => {
    fc.assert(
      fc.property(record, fc.boolean(), (rec, check) => {
        const { missing, extra, valueMismatches } = diffEnv(rec, rec, check);
        expect(missing).toEqual([]);
        expect(extra).toEqual([]);
        expect(valueMismatches).toEqual([]);
      }),
      { numRuns: 2000 },
    );
  });

  test('is deterministic', () => {
    fc.assert(
      fc.property(record, record, fc.boolean(), (current, example, check) => {
        expect(diffEnv(current, example, check)).toEqual(
          diffEnv(current, example, check),
        );
      }),
      { numRuns: 1000 },
    );
  });
});
