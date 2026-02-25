import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printFixTips } from '../../../../src/ui/shared/printFixTips.js';
import type { Filtered } from '../../../../src/config/types.js';

describe('printFixTips', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  const baseFiltered: Filtered = {
    missing: [],
    duplicatesEnv: [],
    duplicatesEx: [],
    gitignoreIssue: null,
  };

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when json is true', () => {
    printFixTips(baseFiltered, false, true, false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does nothing when fix is true', () => {
    printFixTips(baseFiltered, false, false, true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints combined tip for missing + duplicates + envNotIgnored', () => {
    printFixTips(
      { ...baseFiltered, missing: ['A'], duplicatesEnv: [{ key: 'X', count: 2 }] },
      true,
      false,
      false,
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray(
        '💡 Tip: Run with `--fix` to add missing keys, remove duplicates and add .env to .gitignore',
      ),
    );
  });

  it('prints tip for missing + duplicates', () => {
    printFixTips(
      { ...baseFiltered, missing: ['A'], duplicatesEnv: [{ key: 'X', count: 2 }] },
      false,
      false,
      false,
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray(
        '💡 Tip: Run with `--fix` to add missing keys and remove duplicates',
      ),
    );
  });

  it('prints tip for duplicates + envNotIgnored', () => {
    printFixTips(
      { ...baseFiltered, duplicatesEnv: [{ key: 'X', count: 2 }] },
      true,
      false,
      false,
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray(
        '💡 Tip: Run with `--fix` to remove duplicate keys and add .env to .gitignore',
      ),
    );
  });

  it('prints tip for missing + envNotIgnored', () => {
    printFixTips(
      { ...baseFiltered, missing: ['A'] },
      true,
      false,
      false,
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray(
        '💡 Tip: Run with `--fix` to add missing keys and add .env to .gitignore',
      ),
    );
  });

  it('prints tip for missing only', () => {
    printFixTips(
      { ...baseFiltered, missing: ['A'] },
      false,
      false,
      false,
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray('💡 Tip: Run with `--fix` to add missing keys'),
    );
  });

  it('prints tip for duplicates only', () => {
    printFixTips(
      { ...baseFiltered, duplicatesEnv: [{ key: 'X', count: 2 }] },
      false,
      false,
      false,
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray('💡 Tip: Run with `--fix` to remove duplicate keys'),
    );
  });

  it('prints tip for envNotIgnored only', () => {
    printFixTips(baseFiltered, true, false, false);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray(
        '💡 Tip: Run with `--fix` to ensure .env is added to .gitignore',
      ),
    );
  });

  it('prints nothing when no conditions match', () => {
    printFixTips(baseFiltered, false, false, false);

    expect(logSpy).not.toHaveBeenCalled();
  });
});