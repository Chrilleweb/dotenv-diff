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

    // Leading blank line
    expect(logSpy).toHaveBeenNthCalledWith(1);

    // Header
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.magenta('📊 Scan Statistics:'),
    );

    // Values
    expect(logSpy).toHaveBeenNthCalledWith(
      3,
      chalk.magenta.dim('   Files scanned: 10'),
    );

    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      chalk.magenta.dim('   Total variable references: 50'),
    );

    expect(logSpy).toHaveBeenNthCalledWith(
      5,
      chalk.magenta.dim('   Unique variables: 8'),
    );

    expect(logSpy).toHaveBeenNthCalledWith(
      6,
      chalk.magenta.dim('   Warnings: 3'),
    );

    expect(logSpy).toHaveBeenNthCalledWith(
      7,
      chalk.magenta.dim('   Scan duration: 1.23s'),
    );

    // Trailing blank line
    expect(logSpy).toHaveBeenNthCalledWith(8);
  });
});
