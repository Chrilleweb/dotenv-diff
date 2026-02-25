import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printHealthScore } from '../../../../src/ui/scan/printHealthScore.js';

describe('printHealthScore', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false and prints nothing when json is true', () => {
    const result = printHealthScore(95, true);

    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints green excellent health for score >= 90', () => {
    const result = printHealthScore(95, false);

    expect(result).toBe(true);

    expect(logSpy).toHaveBeenCalledWith(
      `💚 ${chalk.green('Project Health Score:')} (95/100)`,
    );

    expect(logSpy).toHaveBeenCalledWith(
      `   ${chalk.green('Excellent health')}`,
    );
  });

  it('prints yellow can improve for score < 90 and >= 70', () => {
    printHealthScore(80, false);

    expect(logSpy).toHaveBeenCalledWith(
      `💛 ${chalk.yellow('Project Health Score:')} (80/100)`,
    );

    expect(logSpy).toHaveBeenCalledWith(`   ${chalk.yellow('Can improve')}`);
  });

  it('prints redBright needs attention for score < 70 and >= 40', () => {
    printHealthScore(60, false);

    expect(logSpy).toHaveBeenCalledWith(
      `🧡 ${chalk.redBright('Project Health Score:')} (60/100)`,
    );

    expect(logSpy).toHaveBeenCalledWith(
      `   ${chalk.redBright('Needs attention')}`,
    );
  });

  it('prints red poor health for score < 40', () => {
    printHealthScore(30, false);

    expect(logSpy).toHaveBeenCalledWith(
      `🚨 ${chalk.red('Project Health Score:')} (30/100)`,
    );

    expect(logSpy).toHaveBeenCalledWith(`   ${chalk.red('Poor health')}`);
  });

  it('always prints trailing blank line when printed', () => {
    printHealthScore(95, false);

    expect(logSpy).toHaveBeenLastCalledWith('');
  });
});
