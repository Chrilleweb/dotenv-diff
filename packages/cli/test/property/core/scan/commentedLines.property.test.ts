import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  findCommentedLines,
  findIgnoreBlockLines,
} from '../../../../src/core/scan/commentedLines.js';

/**
 * Property-based ("fuzz") tests for the commented-line detection.
 *
 * `findCommentedLines` is a small state machine: it walks the lines of a file,
 * toggling "inside block comment", "inside HTML comment" and "inside ignore
 * block" flags. State that leaks between lines is exactly where such filters go
 * wrong, so these tests hammer it with thousands of random files to prove the
 * invariants that must hold under any reasonable semantics: it never throws,
 * stays fast on adversarial input, only reports real line indexes, keeps plain
 * code, and fully contains ignore blocks without leaking state past them.
 * Property-based testing is also what OpenSSF Scorecard recognises as fuzzing
 * for JS/TS.
 */

/** A line with no comment markers of any kind — never commented on its own. */
const plainLine = fc
  .stringMatching(/^[A-Z][A-Z0-9_]{0,10}$/)
  .map((v) => `const x = process.env.${v}`);

/** Leading single-line comment prefixes that are recognised. */
const commentPrefix = fc.constantFrom('//', '#', ' *', '   //', '  # ');

/** Arbitrary line, including binary noise. */
const arbitraryLine = fc.string({ unit: 'binary' });

describe('findCommentedLines (property-based)', () => {
  test('never throws on arbitrary files', () => {
    fc.assert(
      fc.property(fc.array(arbitraryLine, { maxLength: 40 }), (lines) => {
        findCommentedLines(lines);
      }),
      { numRuns: 3000 },
    );
  });

  test('never throws (and stays fast) on adversarial marker runs', () => {
    // Long runs of the whitespace/dash characters the ignore-marker regexes
    // repeat, guarding against catastrophic backtracking (ReDoS).
    const nasty = fc
      .tuple(
        fc.constantFrom('<!--', '-->', '<!-- dotenv', '/*', 'dotenv', '', 'x'),
        fc.integer({ min: 0, max: 4000 }),
        fc.constantFrom(' ', '-', '\t', ' -', '/', '*'),
      )
      .map(([head, n, fill]) => head + fill.repeat(n));
    fc.assert(
      fc.property(fc.array(nasty, { maxLength: 10 }), (lines) => {
        findCommentedLines(lines);
      }),
      { numRuns: 200 },
    );
  });

  test('only reports indexes of lines that exist', () => {
    fc.assert(
      fc.property(fc.array(arbitraryLine, { maxLength: 40 }), (lines) => {
        for (const i of findCommentedLines(lines)) {
          expect(Number.isInteger(i)).toBe(true);
          expect(i).toBeGreaterThanOrEqual(0);
          expect(i).toBeLessThan(lines.length);
        }
      }),
      { numRuns: 3000 },
    );
  });

  test('ignore block lines are always reported as commented', () => {
    fc.assert(
      fc.property(fc.array(arbitraryLine, { maxLength: 40 }), (lines) => {
        const commented = findCommentedLines(lines);
        for (const i of findIgnoreBlockLines(lines)) {
          expect(commented.has(i)).toBe(true);
        }
      }),
      { numRuns: 2000 },
    );
  });

  test('a file of only plain lines has no commented lines', () => {
    fc.assert(
      fc.property(fc.array(plainLine, { maxLength: 20 }), (lines) => {
        expect(findCommentedLines(lines).size).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  test('a comment-prefixed line is always commented', () => {
    fc.assert(
      fc.property(commentPrefix, plainLine, (prefix, line) => {
        expect(findCommentedLines([`${prefix} ${line}`])).toEqual(new Set([0]));
      }),
      { numRuns: 1000 },
    );
  });

  test('an inline `dotenv-diff-ignore` line is always commented', () => {
    fc.assert(
      fc.property(plainLine, (line) => {
        expect(
          findCommentedLines([`${line} // dotenv-diff-ignore`]).has(0),
        ).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  test('a marker embedded mid-line in real code never hides anything', () => {
    // Regression guard: `<!--`, `-->` and `/*` only count at the start of a
    // trimmed line. Mid-line occurrences (strings, `i --> 0`) are code.
    const embedded = fc.oneof(
      plainLine.map((c) => `${c} + "uses <!-- in a string"`),
      plainLine.map((c) => `while (i --> 0) { ${c} }`),
      plainLine.map((c) => `const s = "<!-- literal"; ${c}`),
      plainLine.map((c) => `const glob = "src/*"; ${c}`),
    );
    fc.assert(
      fc.property(embedded, plainLine, (line, next) => {
        expect(findCommentedLines([line, next]).size).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  test('everything between ignore markers is commented, plain code around it is not', () => {
    // Inner lines may carry stray comment markers — the ignore block must
    // still fully contain them without leaking state onto the code after it.
    const marker = fc.constantFrom(
      ['<!-- dotenv-diff-ignore-start -->', '<!-- dotenv-diff-ignore-end -->'],
      ['// dotenv-diff-ignore-start', '// dotenv-diff-ignore-end'],
      ['/* dotenv-diff-ignore-start */', '/* dotenv-diff-ignore-end */'],
    );
    const inner = fc.oneof(
      plainLine,
      fc.tuple(commentPrefix, plainLine).map(([p, c]) => `${p} ${c}`),
      fc.constant('process.env.INNER <!-- stray'),
      fc.constant('<!-- stray open'),
      fc.constant('/* stray open'),
      fc.constant('process.env.INNER -->'),
    );
    fc.assert(
      fc.property(
        fc.array(plainLine, { maxLength: 4 }),
        marker,
        fc.array(inner, { maxLength: 4 }),
        fc.array(plainLine, { maxLength: 4 }),
        (before, [start, end], middle, after) => {
          const lines = [...before, start, ...middle, end, ...after];
          const commented = findCommentedLines(lines);

          const blockStart = before.length;
          const blockEnd = blockStart + middle.length + 1;
          lines.forEach((_, i) => {
            expect(commented.has(i)).toBe(i >= blockStart && i <= blockEnd);
          });
        },
      ),
      { numRuns: 1000 },
    );
  });
});
