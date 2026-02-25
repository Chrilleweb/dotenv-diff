import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printIssues } from '../../../../src/ui/compare/printIssues.js';
import type { Filtered } from '../../../../src/config/types.js';

describe('printIssues', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseFiltered: Filtered = {
    missing: [],
    duplicatesEnv: [],
    duplicatesEx: [],
    gitignoreIssue: null,
  };

  it('does nothing when json is true', () => {
    printIssues(baseFiltered, true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints missing keys when present and fix=false', () => {
    const filtered: Filtered = {
      ...baseFiltered,
      missing: ['A', 'B'],
    };

    printIssues(filtered, false, false);

    expect(logSpy).toHaveBeenCalledWith(chalk.red('❌ Missing keys:'));
    expect(logSpy).toHaveBeenCalledWith(chalk.red('  - A'));
    expect(logSpy).toHaveBeenCalledWith(chalk.red('  - B'));
  });

  it('does not print missing keys when fix=true', () => {
    const filtered: Filtered = {
      ...baseFiltered,
      missing: ['A'],
    };

    printIssues(filtered, false, true);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints extra keys', () => {
    const filtered: Filtered = {
      ...baseFiltered,
      extra: ['X'],
    };

    printIssues(filtered, false);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('⚠️  Extra keys (not in example):'),
    );
    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('  - X'));
  });

  it('prints empty keys', () => {
    const filtered: Filtered = {
      ...baseFiltered,
      empty: ['EMPTY_KEY'],
    };

    printIssues(filtered, false);

    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  Empty values:'));
    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('  - EMPTY_KEY'));
  });

  it('prints mismatches', () => {
    const filtered: Filtered = {
      ...baseFiltered,
      mismatches: [
        {
          key: 'API_KEY',
          expected: '123',
          actual: '456',
        },
      ],
    };

    printIssues(filtered, false);

    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  Value mismatches:'));
    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow("  - API_KEY: expected '123', but got '456'"),
    );
  });

  it('handles all categories together', () => {
    const filtered: Filtered = {
      missing: ['A'],
      extra: ['B'],
      empty: ['C'],
      mismatches: [{ key: 'D', expected: '1', actual: '2' }],
      duplicatesEnv: [],
      duplicatesEx: [],
      gitignoreIssue: null,
    };

    printIssues(filtered, false);

    // Just ensure everything was printed
    expect(logSpy).toHaveBeenCalled();
  });
});
