import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printHealthScore } from '../../../../src/ui/scan/printHealthScore.js';
import { accent, warning, error, header } from '../../../../src/ui/theme.js';
import chalk from 'chalk';

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

  it('prints excellent health for score >= 90', () => {
    const result = printHealthScore(95, false);
    expect(result).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      `${accent('▸')} ${header('Project Health Score')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${chalk.hex('#888888')('Score'.padEnd(26))}${accent('95/100')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${chalk.hex('#888888')('Status'.padEnd(26))}${accent('Excellent health')}`,
    );
  });

  it('prints can improve for score < 90 and >= 70', () => {
    printHealthScore(80, false);
    expect(logSpy).toHaveBeenCalledWith(
      `${warning('▸')} ${header('Project Health Score')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${chalk.hex('#888888')('Score'.padEnd(26))}${warning('80/100')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${chalk.hex('#888888')('Status'.padEnd(26))}${warning('Can improve')}`,
    );
  });

  it('prints needs attention for score < 70 and >= 40', () => {
    printHealthScore(60, false);
    expect(logSpy).toHaveBeenCalledWith(
      `${error('▸')} ${header('Project Health Score')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${chalk.hex('#888888')('Score'.padEnd(26))}${error('60/100')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${chalk.hex('#888888')('Status'.padEnd(26))}${error('Needs attention')}`,
    );
  });

  it('prints poor health for score < 40', () => {
    printHealthScore(30, false);
    expect(logSpy).toHaveBeenCalledWith(
      `${error('▸')} ${header('Project Health Score')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${chalk.hex('#888888')('Score'.padEnd(26))}${error('30/100')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${chalk.hex('#888888')('Status'.padEnd(26))}${error('Poor health')}`,
    );
  });
});
