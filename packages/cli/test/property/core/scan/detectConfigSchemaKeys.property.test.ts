import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { detectConfigSchemaKeys } from '../../../../src/core/scan/detectConfigSchemaKeys.js';

/**
 * Property-based ("fuzz") tests for the config-schema key extractor.
 *
 * This function drives a global (`/g`) regex in an `exec` loop with a manual
 * `lastIndex` reset over untrusted file source — the exact shape that breaks on
 * adversarial input (zero-width matches, `\r`-heavy text, huge lines) or leaks
 * regex state between calls. These properties pin down that it stays total and
 * stateless.
 */
describe('detectConfigSchemaKeys (property-based)', () => {
  // A snippet that makes the file "consume the whole process.env object",
  // which is the precondition for any keys to be extracted.
  const wholesaleSignal = fc.constantFrom(
    'const env = process.env\n',
    'schema.parse(process.env)\n',
    'config.safeParse(process.env)\n',
    'cleanEnv(process.env, {})\n',
    'const merged = { ...process.env }\n',
  );

  test('never throws on arbitrary input', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        detectConfigSchemaKeys(input);
      }),
      { numRuns: 2000 },
    );
  });

  test('returns unique UPPER_SNAKE_CASE keys', () => {
    fc.assert(
      fc.property(wholesaleSignal, fc.string(), (signal, body) => {
        const result = detectConfigSchemaKeys(signal + body);
        expect(Array.isArray(result)).toBe(true);
        for (const key of result) {
          expect(key).toMatch(/^[A-Z_][A-Z0-9_]*$/);
        }
        // Set-backed: no duplicates.
        expect(new Set(result).size).toBe(result.length);
      }),
      { numRuns: 1500 },
    );
  });

  test('returns [] when the file does not consume the whole process.env', () => {
    // Inputs that reference single keys but never the whole object should never
    // trip the wholesale signals, regardless of any UPPER_SNAKE keys present.
    fc.assert(
      fc.property(fc.string(), (body) => {
        const source = `const a = process.env.FOO\nconst obj = { BAR: 1, BAZ: 2 }\n${body}`;
        // Only assert emptiness when no wholesale signal snuck in via `body`.
        if (
          !/process\.env(?!\s*[.[])|\.\.\.process\.env|\bcleanEnv\s*\(\s*process\.env|\.(?:safeParse|parse)\s*\(\s*process\.env/.test(
            source,
          )
        ) {
          expect(detectConfigSchemaKeys(source)).toEqual([]);
        }
      }),
      { numRuns: 1000 },
    );
  });

  test('is idempotent — no regex lastIndex state leaks between calls', () => {
    fc.assert(
      fc.property(wholesaleSignal, fc.string(), (signal, body) => {
        const source = signal + body;
        const first = detectConfigSchemaKeys(source);
        const second = detectConfigSchemaKeys(source);
        expect(second).toEqual(first);
      }),
      { numRuns: 1500 },
    );
  });
});
