import { describe, it, expect } from 'vitest';
import {
  findCommentedLines,
  findIgnoreBlockLines,
} from '../../../../src/core/scan/commentedLines.js';

/** Returns the lines that are *not* commented out, to keep expectations readable. */
const kept = (...lines: string[]): string[] => {
  const commented = findCommentedLines(lines);
  return lines.filter((_, i) => !commented.has(i));
};

describe('findCommentedLines', () => {
  it('keeps normal code lines', () => {
    expect(kept('const url = process.env.API_URL')).toEqual([
      'const url = process.env.API_URL',
    ]);
  });

  it('handles an empty file', () => {
    expect(findCommentedLines([])).toEqual(new Set());
  });

  // ---- single-line comments ----

  it.each([
    '// process.env.API_URL',
    '# process.env.API_URL',
    '/* process.env.API_URL */',
    ' * process.env.API_URL',
    '<!-- process.env.API_URL -->',
    '   // process.env.API_URL',
    '   # process.env.API_URL',
  ])('treats %j as commented', (line) => {
    expect(kept(line)).toEqual([]);
  });

  // ---- dotenv-diff-ignore inline comment ----

  it.each([
    'process.env.API_URL // dotenv-diff-ignore',
    'process.env.API_URL /* dotenv-diff-ignore */',
    'process.env.API_URL <!-- dotenv-diff-ignore -->',
  ])('ignores %j', (line) => {
    expect(kept(line)).toEqual([]);
  });

  it('ignores the line after a dotenv-diff-ignore comment', () => {
    expect(
      kept('// dotenv-diff-ignore', 'process.env.IGNORED', 'process.env.KEPT'),
    ).toEqual(['process.env.KEPT']);
  });

  // ---- multi-line block comments ----

  it('treats every line of a multi-line /* */ comment as commented', () => {
    expect(
      kept(
        'process.env.BEFORE',
        '/*',
        '  process.env.INSIDE',
        '*/',
        'process.env.AFTER',
      ),
    ).toEqual(['process.env.BEFORE', 'process.env.AFTER']);
  });

  it('treats a multi-line JSDoc comment as commented', () => {
    expect(
      kept('/**', ' * Uses process.env.DOC_KEY', ' */', 'process.env.AFTER'),
    ).toEqual(['process.env.AFTER']);
  });

  it('does not treat /*/ as a closed comment', () => {
    expect(
      kept('/*/', 'process.env.INSIDE', '*/', 'process.env.AFTER'),
    ).toEqual(['process.env.AFTER']);
  });

  it('does not open a block comment for /* in the middle of a line', () => {
    expect(
      kept('const glob = "src/*" + process.env.A', 'process.env.B'),
    ).toEqual(['const glob = "src/*" + process.env.A', 'process.env.B']);
  });

  // ---- multi-line HTML comments ----

  it('treats every line of a multi-line HTML comment as commented', () => {
    expect(
      kept(
        'process.env.BEFORE',
        '<!-- start of comment',
        'process.env.INSIDE',
        '-->',
        'process.env.AFTER',
      ),
    ).toEqual(['process.env.BEFORE', 'process.env.AFTER']);
  });

  it('treats the abrupt-close form --!> as a comment terminator', () => {
    expect(
      kept(
        '<!-- commented out',
        'process.env.INSIDE',
        '--!>',
        'process.env.AFTER',
      ),
    ).toEqual(['process.env.AFTER']);
  });

  it('keeps a line containing --> in real code', () => {
    // `-->` is the "goes to" idiom here, not a comment close
    expect(kept('while (i --> 0) { use(process.env.X) }')).toEqual([
      'while (i --> 0) { use(process.env.X) }',
    ]);
  });

  it('does not let a mid-line <!-- inside a string hide following lines', () => {
    expect(
      kept('const s = "<!-- not a comment" + process.env.P', 'process.env.Q'),
    ).toEqual([
      'const s = "<!-- not a comment" + process.env.P',
      'process.env.Q',
    ]);
  });

  // ---- dotenv-diff-ignore-start / end blocks ----

  it.each([
    [
      'HTML',
      '<!-- dotenv-diff-ignore-start -->',
      '<!-- dotenv-diff-ignore-end -->',
    ],
    ['//', '// dotenv-diff-ignore-start', '// dotenv-diff-ignore-end'],
    ['/* */', '/* dotenv-diff-ignore-start */', '/* dotenv-diff-ignore-end */'],
    ['#', '# dotenv-diff-ignore-start', '# dotenv-diff-ignore-end'],
    [
      'uppercase',
      '<!-- DOTENV-DIFF-IGNORE-START -->',
      '<!-- DOTENV-DIFF-IGNORE-END -->',
    ],
    [
      'spaces',
      '<!-- dotenv diff ignore start -->',
      '<!-- dotenv diff ignore end -->',
    ],
  ])('ignores every line in a multi-line %s ignore block', (_, start, end) => {
    expect(
      kept(
        'process.env.BEFORE',
        start,
        '<div>',
        'process.env.INSIDE',
        '</div>',
        end,
        'process.env.AFTER',
      ),
    ).toEqual(['process.env.BEFORE', 'process.env.AFTER']);
  });

  it('does not ignore the line right after an ignore block', () => {
    expect(
      kept(
        '// dotenv-diff-ignore-start',
        'process.env.INSIDE',
        '// dotenv-diff-ignore-end',
        'process.env.AFTER',
      ),
    ).toEqual(['process.env.AFTER']);
  });

  it('ignores the rest of the file when an ignore block is never closed', () => {
    expect(
      kept(
        'process.env.BEFORE',
        '// dotenv-diff-ignore-start',
        'process.env.A',
      ),
    ).toEqual(['process.env.BEFORE']);
  });

  it('does not let comment markers inside an ignore block hide lines after it', () => {
    expect(
      kept(
        '<!-- dotenv-diff-ignore-start -->',
        'process.env.MID <!-- stray open',
        '/* stray block open',
        '<!-- dotenv-diff-ignore-end -->',
        'process.env.AFTER',
      ),
    ).toEqual(['process.env.AFTER']);
  });
});

describe('findIgnoreBlockLines', () => {
  it('returns only the ignore block lines, not regular comments', () => {
    const lines = [
      '// a comment',
      '// dotenv-diff-ignore-start',
      'const key = "secret";',
      '// dotenv-diff-ignore-end',
      '/* another comment */',
    ];
    expect(findIgnoreBlockLines(lines)).toEqual(new Set([1, 2, 3]));
  });
});
