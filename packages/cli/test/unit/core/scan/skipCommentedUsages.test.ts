import { describe, it, expect } from 'vitest';
import { skipCommentedUsages } from '../../../../src/core/scan/skipCommentedUsages.js';
import type { EnvUsage } from '../../../../src/config/types.js';

const usage = (variable: string, context?: string): EnvUsage => ({
  variable,
  context,
});

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
});
