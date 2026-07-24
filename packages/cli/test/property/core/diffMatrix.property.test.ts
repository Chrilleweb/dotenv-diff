import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { diffMatrix } from '../../../src/core/diffMatrix.js';
import type { MatrixFileInput } from '../../../src/config/types.js';

/**
 * Property-based ("fuzz") tests for the env matrix diff.
 *
 * `diffMatrix` builds a key-presence matrix across N files. Because each file's
 * values live in a plain object, a naive `key in obj` / `obj[key]` would see
 * inherited members (`toString`, `constructor`, …) and report phantom presence.
 * These generate thousands of random file sets — deliberately seeded with those
 * prototype key names — and check the result against an independent own-property
 * oracle: presence is own-property truth, values are the real string or
 * undefined (never an inherited function), rows are the sorted key union, and
 * `allMatch` follows from the rows. Property-based testing is also what OpenSSF
 * Scorecard recognises as fuzzing for JS/TS.
 */

const PROTO_KEYS = [
  'toString',
  'constructor',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  '__proto__',
];

const keyArb = fc.oneof(
  fc.stringMatching(/^[A-Z_][A-Z0-9_]{0,6}$/),
  fc.constantFrom(...PROTO_KEYS),
  fc.string(),
);

const fileArb: fc.Arbitrary<MatrixFileInput> = fc.record({
  name: fc.string(),
  values: fc
    .array(fc.tuple(keyArb, fc.string()), { maxLength: 8 })
    // Object.fromEntries defines *own* properties, so even '__proto__' becomes a
    // real own key — matching how the parser would store a literal `__proto__=x`.
    .map((pairs) => Object.fromEntries(pairs) as Record<string, string>),
});

const filesArb = fc.array(fileArb, { maxLength: 5 });

/** Independent, own-property-correct re-derivation of the whole result. */
function oracle(files: MatrixFileInput[], checkValues: boolean) {
  const keys = [...new Set(files.flatMap((f) => Object.keys(f.values)))].sort();
  const rows = keys.map((key) => {
    const presence = files.map((f) => Object.hasOwn(f.values, key));
    const values = files.map((f, i) =>
      presence[i] ? f.values[key] : undefined,
    );
    const present = values.filter((_, i) => presence[i]);
    const hasMismatch = checkValues && new Set(present).size > 1;
    return { key, presence, values, hasMismatch };
  });
  const allMatch = rows.every(
    (r) => r.presence.every(Boolean) && !r.hasMismatch,
  );
  return { files: files.map((f) => f.name), rows, allMatch };
}

describe('diffMatrix (property-based)', () => {
  test('never throws on arbitrary file sets', () => {
    fc.assert(
      fc.property(filesArb, fc.boolean(), (files, checkValues) => {
        diffMatrix(files, checkValues);
      }),
      { numRuns: 3000 },
    );
  });

  test('matches the own-property oracle exactly', () => {
    fc.assert(
      fc.property(filesArb, fc.boolean(), (files, checkValues) => {
        expect(diffMatrix(files, checkValues)).toEqual(
          oracle(files, checkValues),
        );
      }),
      { numRuns: 5000 },
    );
  });

  test('presence and values never leak inherited prototype members', () => {
    fc.assert(
      fc.property(filesArb, fc.boolean(), (files, checkValues) => {
        const res = diffMatrix(files, checkValues);
        for (const row of res.rows) {
          row.presence.forEach((present, i) => {
            // A file is only "present" if it owns the key.
            expect(present).toBe(Object.hasOwn(files[i]!.values, row.key));
            // Values are strings or undefined — never a leaked function.
            const v = row.values[i];
            expect(v === undefined || typeof v === 'string').toBe(true);
            if (!present) expect(v).toBeUndefined();
          });
        }
      }),
      { numRuns: 4000 },
    );
  });

  test('rows are the sorted union of all files’ own keys, aligned to file count', () => {
    fc.assert(
      fc.property(filesArb, (files) => {
        const res = diffMatrix(files);
        const expectedKeys = [
          ...new Set(files.flatMap((f) => Object.keys(f.values))),
        ].sort();
        expect(res.rows.map((r) => r.key)).toEqual(expectedKeys);
        expect(res.files).toEqual(files.map((f) => f.name));
        for (const row of res.rows) {
          expect(row.presence).toHaveLength(files.length);
          expect(row.values).toHaveLength(files.length);
        }
      }),
      { numRuns: 3000 },
    );
  });

  test('allMatch is exactly "every key present everywhere with no mismatch"', () => {
    fc.assert(
      fc.property(filesArb, fc.boolean(), (files, checkValues) => {
        const res = diffMatrix(files, checkValues);
        const expected = res.rows.every(
          (r) => r.presence.every(Boolean) && !r.hasMismatch,
        );
        expect(res.allMatch).toBe(expected);
      }),
      { numRuns: 3000 },
    );
  });

  test('without checkValues, no row is ever flagged as a mismatch', () => {
    fc.assert(
      fc.property(filesArb, (files) => {
        for (const row of diffMatrix(files, false).rows) {
          expect(row.hasMismatch).toBe(false);
        }
      }),
      { numRuns: 3000 },
    );
  });
});
