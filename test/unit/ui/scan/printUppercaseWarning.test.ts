import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printUppercaseWarning } from '../../../../src/ui/scan/printUppercaseWarning.js';
import type { UppercaseWarning } from '../../../../src/config/types.js';

describe('printUppercaseWarning', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when warnings array is empty', () => {
    printUppercaseWarning([], '.env');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints a single uppercase warning', () => {
    const warnings: UppercaseWarning[] = [
      { key: 'apiKey', suggestion: 'API_KEY' },
    ];

    printUppercaseWarning(warnings, '.env');

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('⚠️  Variables not using uppercase naming (.env):'),
    );

    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('   - apiKey'));

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow.dim('     Consider naming it: API_KEY'),
    );

    expect(logSpy).toHaveBeenLastCalledWith();
  });

  it('prints multiple uppercase warnings', () => {
    const warnings: UppercaseWarning[] = [
      { key: 'apiKey', suggestion: 'API_KEY' },
      { key: 'secretKey', suggestion: 'SECRET_KEY' },
    ];

    printUppercaseWarning(warnings, '.env');

    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('   - secretKey'));

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow.dim('     Consider naming it: SECRET_KEY'),
    );
  });
});
