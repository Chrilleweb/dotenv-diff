import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printStats } from '../../../../src/ui/scan/printStats.js';
import type { ScanStats } from '../../../../src/config/types.js';

describe('printStats (scan)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  const stats: ScanStats = {
    filesScanned: 10,
    totalUsages: 50,
    uniqueVariables: 8,
    warningsCount: 3,
    duration: 1.2345,
  };

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when showStats is false', () => {
    printStats(stats, false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints scan statistics when showStats is true', () => {
    printStats(stats, true);

    const dim = chalk.hex('#555555');
    const label = chalk.hex('#888888');
    const value = chalk.hex('#e0e0e0').bold;
    const accent = chalk.hex('#00d4aa');
    const divider = dim('─'.repeat(50));

    const UI_LABEL_WIDTH = 28;

    // Leading blank line
    expect(logSpy).toHaveBeenNthCalledWith(1);

    // Header
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      `${accent('▸')} ${chalk.white.bold('Scan Statistics')}`,
    );

    // Divider
    expect(logSpy).toHaveBeenNthCalledWith(3, `${divider}`);

    // Values
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      `${label('Files scanned'.padEnd(UI_LABEL_WIDTH))}${value('10')}`,
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      5,
      `${label('Variable references'.padEnd(UI_LABEL_WIDTH))}${value('50')}`,
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      6,
      `${label('Unique variables'.padEnd(UI_LABEL_WIDTH))}${value('8')}`,
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      7,
      `${label('Warnings'.padEnd(UI_LABEL_WIDTH))}${value('3')}`,
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      8,
      `${label('Duration'.padEnd(UI_LABEL_WIDTH))}${value('1.23s')}`,
    );

    // Closing divider + trailing blank line
    expect(logSpy).toHaveBeenNthCalledWith(9, `${divider}`);
  });
});
