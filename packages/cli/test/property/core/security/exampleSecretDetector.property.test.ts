import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { detectSecretsInExample } from '../../../../src/core/security/exampleSecretDetector.js';

/**
 * Property-based ("fuzz") tests for the .env.example secret detector.
 *
 * It runs provider regexes and an entropy check over arbitrary env values. The
 * "at most one warning per key" property below is what surfaced (and now guards
 * against a regression of) a real double-report bug: a value matching both a
 * provider pattern and the entropy check produced two warnings for one key.
 */
describe('detectSecretsInExample (property-based)', () => {
  // A mix of real secret shapes, placeholders, and arbitrary noise.
  const value = fc.oneof(
    fc.string(),
    fc.string({ unit: 'binary' }),
    fc.constantFrom(
      'AKIAIOSFODNN7EXAMPLE', // AWS access key id
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', // JWT (pattern + entropy)
      'ghp_012345678901234567890123456789abcd', // GitHub token
      'sk_live_012345678901234567890123456789', // Stripe
      'your_api_key_here', // placeholder
      '<your-token>', // placeholder
      'CHANGE_ME', // placeholder
      'example', // placeholder
      'placeholder', // placeholder
      '', // empty
      '   ', // whitespace only
    ),
  );
  const env = fc.dictionary(fc.string(), value, { maxKeys: 20 });

  test('never throws on arbitrary env records', () => {
    fc.assert(
      fc.property(env, (input) => {
        detectSecretsInExample(input);
      }),
      { numRuns: 2000 },
    );
  });

  test('every warning is well-formed and references an input key', () => {
    fc.assert(
      fc.property(env, (input) => {
        const warnings = detectSecretsInExample(input);
        const keys = new Set(Object.keys(input));
        for (const w of warnings) {
          expect(keys.has(w.key)).toBe(true);
          expect(['Pattern', 'Entropy']).toContain(w.reason);
          expect(['high', 'medium']).toContain(w.severity);
          // The stored value is the trimmed raw value.
          expect(w.value).toBe(String(input[w.key]).trim());
        }
      }),
      { numRuns: 1500 },
    );
  });

  test('reports each key at most once', () => {
    fc.assert(
      fc.property(env, (input) => {
        const warnings = detectSecretsInExample(input);
        const seen = warnings.map((w) => w.key);
        expect(new Set(seen).size).toBe(seen.length);
      }),
      { numRuns: 1500 },
    );
  });

  test('never warns about placeholder or empty values', () => {
    const placeholder = fc.constantFrom(
      '',
      '   ',
      'example',
      'placeholder',
      'your_secret',
      'prefix_your_thing',
      '<token>',
      'CHANGE_ME',
    );
    fc.assert(
      fc.property(
        fc.dictionary(fc.string(), placeholder, { maxKeys: 20 }),
        (input) => {
          expect(detectSecretsInExample(input)).toEqual([]);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
