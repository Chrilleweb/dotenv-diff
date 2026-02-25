import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printInconsistentNamingWarning } from '../../../../src/ui/scan/printInconsistentNamingWarning.js';
import type { InconsistentNamingWarning } from '../../../../src/config/types.js';

describe('printInconsistentNamingWarning', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when warnings array is empty', () => {
    printInconsistentNamingWarning([]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints a single inconsistent naming warning', () => {
    const warnings: InconsistentNamingWarning[] = [
      {
        key1: 'SECRET_KEY',
        key2: 'SECRETKEY',
        suggestion: 'Use SECRET_KEY consistently',
      },
    ];

    printInconsistentNamingWarning(warnings);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('⚠️  Inconsistent naming found:'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow(
        `   - ${chalk.cyan('SECRET_KEY')} ↔ ${chalk.cyan('SECRETKEY')}`,
      ),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray('     Suggested name: Use SECRET_KEY consistently'),
    );

    expect(logSpy).toHaveBeenLastCalledWith();
  });

  it('prints multiple inconsistent naming warnings', () => {
    const warnings: InconsistentNamingWarning[] = [
      {
        key1: 'A',
        key2: 'B',
        suggestion: 'Use A',
      },
      {
        key1: 'X',
        key2: 'Y',
        suggestion: 'Use X',
      },
    ];

    printInconsistentNamingWarning(warnings);

    expect(
      logSpy.mock.calls.some(
        (call: [string]) =>
          String(call[0]).includes('A') && String(call[0]).includes('B'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some(
        (call: [string]) =>
          String(call[0]).includes('X') && String(call[0]).includes('Y'),
      ),
    ).toBe(true);
  });
});
