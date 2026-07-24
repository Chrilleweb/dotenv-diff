import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { skipCommentedUsages } from '../../../../src/core/scan/skipCommentedUsages.js';
import type { EnvUsage } from '../../../../src/config/types.js';

/**
 * Property-based ("fuzz") tests for the commented-usage filter.
 *
 * `skipCommentedUsages` is a small state machine: it walks the usages in order,
 * toggling "inside HTML comment" and "inside ignore block" flags, and drops the
 * ones that fall inside a comment. State that leaks between usages is exactly
 * where such filters go wrong, so these tests hammer it with thousands of random
 * usage sequences to prove the invariants that must hold under any reasonable
 * semantics: it never throws, never invents or mutates a usage, keeps the output
 * a faithful subsequence of the input, treats context-less usages as
 * transparent, and is idempotent. Property-based testing is also what OpenSSF
 * Scorecard recognises as fuzzing for JS/TS.
 */

const mkUsage = (variable: string, context?: string): EnvUsage =>
  ({ variable, context }) as EnvUsage;

/** A context string with no comment markers of any kind — always kept alone. */
const plainContext = fc
  .stringMatching(/^[A-Z][A-Z0-9_]{0,10}$/)
  .map((v) => `const x = process.env.${v}`);

/** Leading single-line comment prefixes the filter recognises. */
const commentPrefix = fc.constantFrom('//', '#', '/*', ' *', '   //', '  # ');

/** Arbitrary usage whose context may be anything, including undefined/binary. */
const arbitraryUsage = fc
  .record({
    variable: fc.string(),
    context: fc.option(fc.string({ unit: 'binary' }), { nil: undefined }),
  })
  .map(({ variable, context }) => mkUsage(variable, context));

/** Compares two arrays by reference identity, element for element. */
const sameRefs = (a: readonly EnvUsage[], b: readonly EnvUsage[]) => {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
};

describe('skipCommentedUsages (property-based)', () => {
  test('never throws on arbitrary usage sequences', () => {
    fc.assert(
      fc.property(fc.array(arbitraryUsage, { maxLength: 40 }), (usages) => {
        skipCommentedUsages(usages);
      }),
      { numRuns: 3000 },
    );
  });

  test('never throws (and stays fast) on adversarial marker runs', () => {
    // Long runs of the whitespace/dash characters the ignore-block regexes
    // repeat, guarding against catastrophic backtracking (ReDoS).
    const nasty = fc
      .tuple(
        fc.constantFrom('<!--', '-->', '<!-- dotenv', '', 'x'),
        fc.integer({ min: 0, max: 4000 }),
        fc.constantFrom(' ', '-', '\t', ' -'),
      )
      .map(([head, n, fill]) => mkUsage('V', head + fill.repeat(n)));
    fc.assert(
      fc.property(fc.array(nasty, { maxLength: 10 }), (usages) => {
        skipCommentedUsages(usages);
      }),
      { numRuns: 200 },
    );
  });

  test('output is a reference-preserving subsequence of the input', () => {
    fc.assert(
      fc.property(fc.array(arbitraryUsage, { maxLength: 40 }), (usages) => {
        const out = skipCommentedUsages(usages);
        // Never longer, never invents elements, order preserved, no mutation.
        expect(out.length).toBeLessThanOrEqual(usages.length);
        let searchFrom = 0;
        for (const item of out) {
          const idx = usages.indexOf(item, searchFrom);
          expect(idx).toBeGreaterThanOrEqual(searchFrom);
          searchFrom = idx + 1;
        }
      }),
      { numRuns: 3000 },
    );
  });

  test('usages without a context are always kept', () => {
    const blank = fc.oneof(
      fc.constant(mkUsage('V', undefined)),
      fc.constant(mkUsage('V', '')),
    );
    fc.assert(
      fc.property(
        fc.array(fc.oneof(arbitraryUsage, blank), { maxLength: 40 }),
        (usages) => {
          const out = skipCommentedUsages(usages);
          for (const u of usages) {
            if (!u.context) expect(out).toContain(u);
          }
        },
      ),
      { numRuns: 2000 },
    );
  });

  test('context-less usages are transparent to the state machine', () => {
    // Sprinkling in usages with no context must not change the fate of the
    // others — dropping the blanks first yields the same with-context result.
    const blank = fc.constant(mkUsage('BLANK', undefined));
    fc.assert(
      fc.property(
        fc.array(fc.oneof(arbitraryUsage, blank), { maxLength: 40 }),
        (usages) => {
          const withBlanks = skipCommentedUsages(usages).filter(
            (u) => u.context,
          );
          const withoutBlanks = skipCommentedUsages(
            usages.filter((u) => u.context),
          );
          sameRefs(withBlanks, withoutBlanks);
        },
      ),
      { numRuns: 2000 },
    );
  });

  test('is idempotent — filtering the result changes nothing', () => {
    fc.assert(
      fc.property(fc.array(arbitraryUsage, { maxLength: 40 }), (usages) => {
        const once = skipCommentedUsages(usages);
        const twice = skipCommentedUsages(once);
        sameRefs(twice, once);
      }),
      { numRuns: 3000 },
    );
  });

  test('a lone plain usage is always kept', () => {
    fc.assert(
      fc.property(plainContext, (ctx) => {
        const u = mkUsage('V', ctx);
        expect(skipCommentedUsages([u])).toEqual([u]);
      }),
      { numRuns: 1000 },
    );
  });

  test('a lone comment-prefixed usage is always dropped', () => {
    fc.assert(
      fc.property(commentPrefix, plainContext, (prefix, ctx) => {
        expect(skipCommentedUsages([mkUsage('V', `${prefix} ${ctx}`)])).toEqual(
          [],
        );
      }),
      { numRuns: 1000 },
    );
  });

  test('a lone inline `dotenv-diff-ignore` usage is always dropped', () => {
    fc.assert(
      fc.property(plainContext, (ctx) => {
        expect(
          skipCommentedUsages([mkUsage('V', `${ctx} // dotenv-diff-ignore`)]),
        ).toEqual([]);
      }),
      { numRuns: 1000 },
    );
  });

  test('a marker embedded mid-line in real code never drops the usage', () => {
    // Regression guard: `<!--`/`-->` only count at the start of a trimmed line.
    // Mid-line occurrences (string literals, the `i --> 0` idiom) are code.
    const embedded = fc.oneof(
      plainContext.map((c) => `${c} // uses <!-- in a string`),
      plainContext.map((c) => `while (i --> 0) { ${c} }`),
      plainContext.map((c) => `const s = "<!-- literal"; ${c}`),
    );
    fc.assert(
      fc.property(embedded, (ctx) => {
        const u = mkUsage('V', ctx);
        expect(skipCommentedUsages([u])).toEqual([u]);
      }),
      { numRuns: 1000 },
    );
  });

  test('an ignore block never leaks HTML-comment state onto usages after it', () => {
    // Regression guard (state leak): a stray `<!--`/`-->` on a line inside the
    // ignore block must not drop plain usages that follow the block.
    const strayInside = fc.constantFrom(
      'process.env.MID <!-- stray open',
      'foo(process.env.MID) -->',
      'x = "<!--" + process.env.MID',
    );
    fc.assert(
      fc.property(
        fc.array(strayInside, { maxLength: 4 }),
        plainContext,
        (inner, afterCtx) => {
          const after = mkUsage('AFTER', afterCtx);
          const usages = [
            mkUsage('START', '<!-- dotenv-diff-ignore-start -->'),
            ...inner.map((c, i) => mkUsage(`I${i}`, c)),
            mkUsage('END', '<!-- dotenv-diff-ignore-end -->'),
            after,
          ];
          expect(skipCommentedUsages(usages)).toEqual([after]);
        },
      ),
      { numRuns: 1000 },
    );
  });

  test('everything between well-formed ignore markers is dropped, plain code around it is kept', () => {
    // Inner lines may even carry stray HTML markers — the ignore block must
    // still fully contain them without leaking state onto the surrounding code.
    const cleanInner = fc.oneof(
      plainContext,
      fc.tuple(commentPrefix, plainContext).map(([p, c]) => `${p} ${c}`),
      fc.constant('process.env.INNER <!-- stray'),
      fc.constant('process.env.INNER -->'),
    );
    fc.assert(
      fc.property(
        fc.array(plainContext, { maxLength: 4 }),
        fc.array(cleanInner, { maxLength: 4 }),
        fc.array(plainContext, { maxLength: 4 }),
        (before, inner, after) => {
          const beforeU = before.map((c, i) => mkUsage(`B${i}`, c));
          const afterU = after.map((c, i) => mkUsage(`A${i}`, c));
          const usages = [
            ...beforeU,
            mkUsage('START', '<!-- dotenv-diff-ignore-start -->'),
            ...inner.map((c, i) => mkUsage(`I${i}`, c)),
            mkUsage('END', '<!-- dotenv-diff-ignore-end -->'),
            ...afterU,
          ];
          const out = skipCommentedUsages(usages);
          sameRefs(out, [...beforeU, ...afterU]);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
