import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  stripBom,
  splitEnvLines,
  parseEnvLine,
} from '../../../src/core/envLine.js';

/**
 * Property-based ("fuzz") tests for the low-level dotenv line helpers.
 *
 * `parseEnvLine` / `splitEnvLines` / `stripBom` sit under the whole tool — the
 * diff, the duplicate scanner and the expiration reader all build on them — so
 * these feed thousands of random inputs (control chars, unicode, stray `=`/`#`,
 * BOMs, mixed line endings) to prove they never throw and always uphold their
 * documented shape: parsed keys are non-empty and trimmed, values are trimmed,
 * splitting round-trips, and re-parsing a parsed line is stable (idempotent).
 * Property-based testing is also what OpenSSF Scorecard recognises as fuzzing
 * for JS/TS.
 */

const BOM = '﻿';

describe('parseEnvLine (property-based)', () => {
  test('never throws on arbitrary unicode / control chars', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (line) => {
        parseEnvLine(line);
      }),
      { numRuns: 3000 },
    );
  });

  test('a returned pair always has a non-empty, trimmed, `=`-free key and a trimmed value', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (line) => {
        const parsed = parseEnvLine(line);
        if (parsed === null) return;
        expect(parsed.key.length).toBeGreaterThan(0);
        expect(parsed.key).toBe(parsed.key.trim());
        expect(parsed.key).not.toContain('=');
        expect(parsed.value).toBe(parsed.value.trim());
      }),
      { numRuns: 3000 },
    );
  });

  test('blank, whitespace-only and comment lines are always rejected', () => {
    const blank = fc.stringMatching(/^\s*$/);
    const comment = fc
      .tuple(fc.stringMatching(/^\s*$/), fc.string())
      .map(([ws, rest]) => `${ws}#${rest.replace(/[\r\n]/g, ' ')}`);
    fc.assert(
      fc.property(fc.oneof(blank, comment), (line) => {
        expect(parseEnvLine(line)).toBeNull();
      }),
      { numRuns: 2000 },
    );
  });

  test('a line with no `=` or an empty key is rejected', () => {
    // No '=' anywhere, and not a comment/blank → must be null.
    const noEquals = fc
      .string({ unit: 'binary' })
      .filter(
        (s) =>
          !s.includes('=') && s.trim().length > 0 && !s.trim().startsWith('#'),
      );
    fc.assert(
      fc.property(noEquals, (line) => {
        expect(parseEnvLine(line)).toBeNull();
      }),
      { numRuns: 2000 },
    );
  });

  test('re-parsing a parsed line is stable (idempotent)', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (line) => {
        const first = parseEnvLine(line);
        if (first === null) return;
        const second = parseEnvLine(`${first.key}=${first.value}`);
        expect(second).toEqual(first);
      }),
      { numRuns: 5000 },
    );
  });

  test('round-trips well-formed KEY=VALUE lines', () => {
    const key = fc
      .stringMatching(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .filter((k) => k.length > 0);
    // Trimmed, newline-free values (including the empty value).
    const value = fc
      .string()
      .filter((v) => !/[\r\n]/.test(v))
      .map((v) => v.trim());
    fc.assert(
      fc.property(key, value, (k, v) => {
        expect(parseEnvLine(`${k}=${v}`)).toEqual({ key: k, value: v });
      }),
      { numRuns: 2000 },
    );
  });

  test('splits only on the first `=`', () => {
    const key = fc
      .stringMatching(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .filter((k) => k.length > 0);
    const value = fc
      .string()
      .filter((v) => !/[\r\n]/.test(v))
      .map((v) => v.trim())
      .filter((v) => v.includes('='));
    fc.assert(
      fc.property(key, value, (k, v) => {
        const parsed = parseEnvLine(`${k}=${v}`);
        expect(parsed).toEqual({ key: k, value: v });
      }),
      { numRuns: 1000 },
    );
  });
});

describe('splitEnvLines (property-based)', () => {
  test('is total and never returns an empty array', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        const lines = splitEnvLines(input);
        expect(Array.isArray(lines)).toBe(true);
        expect(lines.length).toBeGreaterThanOrEqual(1);
        // No element retains a '\n'. A lone '\r' (classic-Mac ending, not part
        // of a '\r\n') is intentionally left intact — split is on /\r?\n/.
        for (const l of lines) expect(l.includes('\n')).toBe(false);
      }),
      { numRuns: 3000 },
    );
  });

  test('round-trips arrays of newline-free lines joined by \\n', () => {
    const lineNoBreaks = fc
      .string({ unit: 'binary' })
      .filter((s) => !/[\r\n]/.test(s));
    fc.assert(
      fc.property(
        fc.array(lineNoBreaks, { minLength: 1, maxLength: 30 }),
        (lines) => {
          // Guard: a leading BOM on the first element would be stripped.
          fc.pre(!lines[0]!.startsWith(BOM));
          expect(splitEnvLines(lines.join('\n'))).toEqual(lines);
        },
      ),
      { numRuns: 2000 },
    );
  });

  test('line count equals the number of newline separators plus one', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        const stripped = stripBom(input);
        const separators = (stripped.match(/\r?\n/g) ?? []).length;
        expect(splitEnvLines(input).length).toBe(separators + 1);
      }),
      { numRuns: 2000 },
    );
  });
});

describe('stripBom (property-based)', () => {
  test('is idempotent and removes at most one leading BOM', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        const once = stripBom(input);
        expect(stripBom(once)).toBe(once);
        // Only a *leading* BOM is affected; length shrinks by 0 or 1.
        expect(input.length - once.length).toBeGreaterThanOrEqual(0);
        expect(input.length - once.length).toBeLessThanOrEqual(1);
      }),
      { numRuns: 3000 },
    );
  });

  test('strips exactly one BOM when the input starts with one', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (rest) => {
        expect(stripBom(`${BOM}${rest}`)).toBe(rest);
      }),
      { numRuns: 2000 },
    );
  });
});
