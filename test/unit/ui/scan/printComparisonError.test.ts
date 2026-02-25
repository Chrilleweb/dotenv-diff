import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printComparisonError } from '../../../../src/ui/scan/printComparisonError.js';

describe('printComparisonError', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints red error and exits when shouldExit is true (json=false)', () => {
    const result = printComparisonError('Something went wrong', true, false);

    expect(logSpy).toHaveBeenCalledWith(chalk.red('❌  Something went wrong'));

    expect(result).toEqual({ exit: true });
  });

  it('prints red error and exits when shouldExit is true (json=true)', () => {
    const result = printComparisonError('Something went wrong', true, true);

    expect(logSpy).toHaveBeenCalledWith(chalk.red('❌  Something went wrong'));

    expect(result).toEqual({ exit: true });
  });

  it('prints yellow warning when shouldExit is false and json=false', () => {
    const result = printComparisonError('Minor issue', false, false);

    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  Minor issue'));

    expect(result).toEqual({ exit: false });
  });

  it('does not print anything when shouldExit is false and json=true', () => {
    const result = printComparisonError('Minor issue', false, true);

    expect(logSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ exit: false });
  });
});
