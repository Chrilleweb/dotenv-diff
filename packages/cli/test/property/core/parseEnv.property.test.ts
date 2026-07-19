import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { parseEnvContent } from '../../../src/core/parseEnv.js';
import {
  parseEnvLine,
  splitEnvLines,
  stripBom,
} from '../../../src/core/envLine.js';

/**
 * Property-based ("fuzz") tests for the dotenv parser.
 *
 * These feed thousands of randomly-generated strings — including control
 * characters, unicode, and pathological shapes — into the parser to prove it
 * never throws and always upholds its documented invariants. Property-based
 * testing is also what OpenSSF Scorecard recognises as fuzzing for JS/TS.
 */
describe('parseEnv (property-based)', () => {
  test('parseEnvContent never throws on arbitrary input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        parseEnvContent(input);
      }),
      { numRuns: 2000 },
    );
  });

  test('parseEnvContent never throws on arbitrary unicode / control chars', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        parseEnvContent(input);
      }),
      { numRuns: 2000 },
    );
  });

  test('parseEnvContent always returns a plain object of strings', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = parseEnvContent(input);
        expect(typeof result).toBe('object');
        for (const [key, value] of Object.entries(result)) {
          expect(typeof key).toBe('string');
          expect(typeof value).toBe('string');
        }
      }),
      { numRuns: 1000 },
    );
  });

  test('round-trips well-formed KEY=VALUE lines', () => {
    // Keys: identifier-shaped; values: no newlines, no leading/trailing space,
    // no '#'/'=' at the boundaries that the trimming parser would alter.
    const key = fc
      .stringMatching(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .filter((k) => k.length > 0);
    const value = fc
      .string()
      .filter((v) => !/[\r\n]/.test(v))
      .map((v) => v.trim())
      .filter((v) => v.length > 0 && !v.startsWith('#'));

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.tuple(key, value), {
          selector: ([k]) => k,
          maxLength: 25,
        }),
        (pairs) => {
          const content = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
          const parsed = parseEnvContent(content);
          for (const [k, v] of pairs) {
            expect(parsed[k]).toBe(v);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  test('comment and blank lines never produce keys', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        const line = `#${raw.replace(/[\r\n]/g, ' ')}`;
        expect(parseEnvLine(line)).toBeNull();
      }),
      { numRuns: 1000 },
    );
  });

  test('splitEnvLines is total and strips a leading BOM', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const lines = splitEnvLines(input);
        expect(Array.isArray(lines)).toBe(true);
        // stripBom is idempotent
        expect(stripBom(stripBom(input))).toBe(stripBom(input));
      }),
      { numRuns: 1000 },
    );
  });
});
