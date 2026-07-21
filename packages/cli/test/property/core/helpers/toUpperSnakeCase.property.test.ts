import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { toUpperSnakeCase } from '../../../../src/core/helpers/toUpperSnakeCase.js';

/**
 * Property-based ("fuzz") tests for the UPPER_SNAKE_CASE key normalizer.
 *
 * These feed thousands of randomly-generated names — including control
 * characters, unicode, and pathological shapes — into `toUpperSnakeCase` to
 * prove it never throws and always upholds the shape of its output: fully
 * upper-cased, with no dashes or whitespace left behind. Property-based testing
 * is also what OpenSSF Scorecard recognises as fuzzing for JS/TS.
 */
describe('toUpperSnakeCase (property-based)', () => {
  test('never throws on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        toUpperSnakeCase(name);
      }),
      { numRuns: 2000 },
    );
  });

  test('never throws on arbitrary unicode / control chars', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (name) => {
        toUpperSnakeCase(name);
      }),
      { numRuns: 2000 },
    );
  });

  test('output is always fully upper-cased', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (name) => {
        const out = toUpperSnakeCase(name);
        expect(out).toBe(out.toUpperCase());
        // And no ASCII lowercase letters survive.
        expect(/[a-z]/.test(out)).toBe(false);
      }),
      { numRuns: 2000 },
    );
  });

  test('output never contains dashes or whitespace', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (name) => {
        const out = toUpperSnakeCase(name);
        expect(/[-\s]/.test(out)).toBe(false);
      }),
      { numRuns: 2000 },
    );
  });

  test('leaves already-uppercase, digit-free snake keys unchanged', () => {
    // Restricted to [A-Z_] (no digits): the digit→UPPER rule would otherwise
    // insert an underscore, so digits are deliberately excluded here.
    const upperKey = fc.stringMatching(/^[A-Z_]+$/).filter((k) => k.length > 0);
    fc.assert(
      fc.property(upperKey, (key) => {
        expect(toUpperSnakeCase(key)).toBe(key);
      }),
      { numRuns: 1000 },
    );
  });

  test('collapses runs of dashes and spaces into a single underscore', () => {
    // Lowercase-only words, so no camelCase boundary fires inside a word.
    const word = fc.stringMatching(/^[a-z]+$/).filter((w) => w.length > 0);
    const separator = fc
      .stringMatching(/^[-\s]+$/)
      .filter((s) => s.length > 0 && !/[\r\n]/.test(s));
    fc.assert(
      fc.property(word, separator, word, (a, sep, b) => {
        expect(toUpperSnakeCase(`${a}${sep}${b}`)).toBe(
          `${a.toUpperCase()}_${b.toUpperCase()}`,
        );
      }),
      { numRuns: 1000 },
    );
  });

  test('documented examples', () => {
    expect(toUpperSnakeCase('camelCase')).toBe('CAMEL_CASE');
    expect(toUpperSnakeCase('my-key')).toBe('MY_KEY');
    expect(toUpperSnakeCase('my  key')).toBe('MY_KEY');
    expect(toUpperSnakeCase('apiKey')).toBe('API_KEY');
    expect(toUpperSnakeCase('already_upper')).toBe('ALREADY_UPPER');
  });
});
