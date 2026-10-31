import { describe, it, expect } from 'vitest';
import { skipCommentedUsages } from '../../../../src/core/scan/skipCommentedUsages.js';
import type { EnvUsage } from '../../../../src/config/types.js';

const usage = (variable: string, context?: string): EnvUsage =>
  ({ variable, context }) as EnvUsage;

describe('skipCommentedUsages', () => {
  it('keeps usages without context', () => {
    const usages = [usage('API_URL'), usage('DB_HOST')];
    expect(skipCommentedUsages(usages)).toEqual(usages);
  });

  it('keeps normal (non-commented) usages', () => {
    const usages = [usage('API_URL', 'const url = process.env.API_URL')];
    expect(skipCommentedUsages(usages)).toEqual(usages);
  });

  // ---- single-line comment prefixes ----

  it('filters // commented lines', () => {
    expect(
      skipCommentedUsages([usage('API_URL', '// process.env.API_URL')]),
    ).toEqual([]);
  });

  it('filters # commented lines', () => {
    expect(
      skipCommentedUsages([usage('API_URL', '# process.env.API_URL')]),
    ).toEqual([]);
  });

  it('filters /* commented lines', () => {
    expect(
      skipCommentedUsages([usage('API_URL', '/* process.env.API_URL')]),
    ).toEqual([]);
  });

  it('filters * commented lines (inside block comment)', () => {
    expect(
      skipCommentedUsages([usage('API_URL', ' * process.env.API_URL')]),
    ).toEqual([]);
  });

  it('filters <!-- commented lines', () => {
    expect(
      skipCommentedUsages([usage('API_URL', '<!-- process.env.API_URL -->')]),
    ).toEqual([]);
  });

  it('filters leading whitespace before comment prefix', () => {
    expect(
      skipCommentedUsages([usage('API_URL', '   // process.env.API_URL')]),
    ).toEqual([]);
    expect(
      skipCommentedUsages([usage('API_URL', '   # process.env.API_URL')]),
    ).toEqual([]);
    expect(
      skipCommentedUsages([usage('API_URL', '   /* process.env.API_URL')]),
    ).toEqual([]);
  });

  // ---- dotenv-diff-ignore inline comment ----

  it('filters lines with // dotenv-diff-ignore', () => {
    expect(
      skipCommentedUsages([
        usage('API_URL', 'process.env.API_URL // dotenv-diff-ignore'),
      ]),
    ).toEqual([]);
  });

  it('filters lines with <!-- dotenv-diff-ignore --> inline', () => {
    expect(
      skipCommentedUsages([
        usage('API_URL', 'process.env.API_URL <!-- dotenv-diff-ignore -->'),
      ]),
    ).toEqual([]);
  });

  // ---- HTML comment blocks ----

  it('filters lines inside an open HTML comment', () => {
    const usages = [
      usage('BEFORE', 'const a = process.env.BEFORE'),
      usage('START', '<!-- start of comment'),
      usage('INSIDE', 'process.env.API_URL'),
      usage('END', '-->'),
      usage('AFTER', 'const b = process.env.AFTER'),
    ];
    const result = skipCommentedUsages(usages);
    expect(result.map((u) => u.variable)).toEqual(['BEFORE', 'AFTER']);
  });

  it('filters the --> closing line itself', () => {
    const usages = [
      usage('A', '<!--'),
      usage('B', 'process.env.SECRET'),
      usage('C', '-->'),
    ];
    const result = skipCommentedUsages(usages);
    expect(result).toEqual([]);
  });

  // ---- dotenv-diff-ignore-start / end blocks ----

  it('filters usages inside ignore-start/end block', () => {
    const usages = [
      usage('BEFORE', 'process.env.BEFORE'),
      usage('START', '<!-- dotenv-diff-ignore-start -->'),
      usage('INSIDE', 'process.env.INSIDE'),
      usage('END', '<!-- dotenv-diff-ignore-end -->'),
      usage('AFTER', 'process.env.AFTER'),
    ];
    const result = skipCommentedUsages(usages);
    expect(result.map((u) => u.variable)).toEqual(['BEFORE', 'AFTER']);
  });

  it('also removes the start and end marker lines themselves', () => {
    const usages = [
      usage('START', '<!-- dotenv-diff-ignore-start -->'),
      usage('END', '<!-- dotenv-diff-ignore-end -->'),
    ];
    expect(skipCommentedUsages(usages)).toEqual([]);
  });

  it('is case-insensitive for ignore block markers', () => {
    const usages = [
      usage('START', '<!-- DOTENV-DIFF-IGNORE-START -->'),
      usage('INSIDE', 'process.env.INSIDE'),
      usage('END', '<!-- DOTENV-DIFF-IGNORE-END -->'),
    ];
    expect(skipCommentedUsages(usages)).toEqual([]);
  });

  it('accepts dashes and spaces in ignore block markers', () => {
    const usages = [
      usage('START', '<!-- dotenv diff ignore start -->'),
      usage('INSIDE', 'process.env.INSIDE'),
      usage('END', '<!-- dotenv diff ignore end -->'),
    ];
    expect(skipCommentedUsages(usages)).toEqual([]);
  });

  // ---- mixed scenarios ----

  it('keeps usages that come after the ignore block ends', () => {
    const usages = [
      usage('IN', '<!-- dotenv-diff-ignore-start -->'),
      usage('IGNORED', 'process.env.IGNORED'),
      usage('OUT', '<!-- dotenv-diff-ignore-end -->'),
      usage('KEPT', 'process.env.KEPT'),
    ];
    const result = skipCommentedUsages(usages);
    expect(result.map((u) => u.variable)).toEqual(['KEPT']);
  });

  it('returns empty array when all usages are commented', () => {
    const usages = [
      usage('A', '// process.env.A'),
      usage('B', '# process.env.B'),
      usage('C', '/* process.env.C'),
    ];
    expect(skipCommentedUsages(usages)).toEqual([]);
  });

  it('returns all usages when none are commented', () => {
    const usages = [
      usage('A', 'doSomething(process.env.A)'),
      usage('B', 'const x = process.env.B'),
    ];
    expect(skipCommentedUsages(usages)).toEqual(usages);
  });

  it('handles empty array', () => {
    expect(skipCommentedUsages([])).toEqual([]);
  });

  // ---- regressions: markers embedded in code/strings must not drop usages ----

  it('keeps a usage after an ignore block even if a line inside it had a stray <!--', () => {
    // Regression (case A): the stray `<!--` used to set insideHtmlComment, which
    // ignore-end never reset, silently dropping AFTER.
    const usages = [
      usage('START', '<!-- dotenv-diff-ignore-start -->'),
      usage('MID', 'process.env.MID <!-- stray open'),
      usage('END', '<!-- dotenv-diff-ignore-end -->'),
      usage('AFTER', 'process.env.AFTER'),
    ];
    expect(skipCommentedUsages(usages).map((u) => u.variable)).toEqual([
      'AFTER',
    ]);
  });

  it('keeps a usage on a line containing --> in real code', () => {
    // Regression (case B): `-->` is the "goes to" idiom here, not a comment close.
    const usages = [usage('X', 'while (i --> 0) { use(process.env.X) }')];
    expect(skipCommentedUsages(usages).map((u) => u.variable)).toEqual(['X']);
  });

  it('treats the abrupt-close form --!> as a comment terminator', () => {
    // Per the WHATWG spec `--!>` also closes an HTML comment, so the usage on
    // the following line must be kept (the comment ends, it is not inside it).
    const usages = [
      usage('OPEN', '<!-- commented out'),
      usage('INSIDE', 'process.env.INSIDE'),
      usage('CLOSE', '--!>'),
      usage('AFTER', 'process.env.AFTER'),
    ];
    expect(skipCommentedUsages(usages).map((u) => u.variable)).toEqual([
      'AFTER',
    ]);
  });

  it('does not let a mid-line <!-- inside a string poison following usages', () => {
    // Regression (case C): `<!--` inside a string literal is not a comment.
    const usages = [
      usage('P', 'const s = "<!-- not a comment" + process.env.P'),
      usage('Q', 'process.env.Q'),
    ];
    expect(skipCommentedUsages(usages).map((u) => u.variable)).toEqual([
      'P',
      'Q',
    ]);
  });

  // ---- per-file state and line order ----

  const at = (
    variable: string,
    file: string,
    line: number,
    context: string,
  ): EnvUsage => ({ variable, file, line, context }) as EnvUsage;

  it('does not let an unclosed HTML comment in one file hide usages in another', () => {
    const usages = [
      at('OLD_THING', 'src/a.svelte', 1, '<!-- old: {process.env.OLD_THING}'),
      at('REAL_ONE', 'src/b.ts', 1, 'const y = process.env.REAL_ONE;'),
      at('REAL_TWO', 'src/b.ts', 2, 'const z = process.env.REAL_TWO;'),
    ];

    expect(skipCommentedUsages(usages).map((u) => u.variable)).toEqual([
      'REAL_ONE',
      'REAL_TWO',
    ]);
  });

  it('does not let an open ignore block in one file hide usages in another', () => {
    const usages = [
      at('A', 'src/a.svelte', 1, '<!-- dotenv-diff-ignore-start -->'),
      at('B', 'src/b.ts', 1, 'const b = process.env.B;'),
    ];

    expect(skipCommentedUsages(usages).map((u) => u.variable)).toEqual(['B']);
  });

  it('tracks HTML comments in line order, not in the order usages arrive', () => {
    // The scanner groups usages by pattern, so a line inside the comment can
    // arrive before the line that opens it
    const usages = [
      at('INSIDE', 'src/a.svelte', 2, '{import.meta.env.INSIDE}'),
      at('OPEN', 'src/a.svelte', 1, '<!-- {process.env.OPEN}'),
      at('CLOSE', 'src/a.svelte', 3, '{process.env.CLOSE} -->'),
      at('AFTER', 'src/a.svelte', 4, '<p>{import.meta.env.AFTER}</p>'),
    ];

    expect(skipCommentedUsages(usages).map((u) => u.variable)).toEqual([
      'AFTER',
    ]);
  });

  it('keeps the original order of the remaining usages', () => {
    const usages = [
      at('B2', 'src/b.ts', 2, 'process.env.B2'),
      at('A1', 'src/a.ts', 1, 'process.env.A1'),
      at('B1', 'src/b.ts', 1, 'process.env.B1'),
    ];

    expect(skipCommentedUsages(usages)).toEqual(usages);
  });
});
