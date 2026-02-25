import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printStats } from '../../../../src/ui/compare/printStats.js';

describe('printStats', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  const baseStats = {
    envCount: 5,
    exampleCount: 4,
    sharedCount: 3,
    duplicateCount: 1,
    valueMismatchCount: 2,
  };

  const baseFiltered = {
    missing: ['A'],
  };

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when json is true', () => {
    printStats(
      '.env',
      '.env.example',
      baseStats,
      baseFiltered,
      true,
      true,
      true,
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does nothing when showStats is false', () => {
    printStats(
      '.env',
      '.env.example',
      baseStats,
      baseFiltered,
      false,
      false,
      true,
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints full statistics with extra, empty and checkValues enabled', () => {
    const filtered = {
      missing: ['A'],
      extra: ['B'],
      empty: ['C'],
    };

    printStats('.env', '.env.example', baseStats, filtered, false, true, true);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta('📊 Compare Statistics:'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Keys in .env: 5'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Keys in .env.example: 4'),
    );

    expect(logSpy).toHaveBeenCalledWith(chalk.magenta.dim('   Shared keys: 3'));

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Missing (in .env): 1'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Extra (not in .env.example): 1'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Empty values: 1'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Duplicate keys: 1'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Value mismatches: 2'),
    );
  });

  it('skips optional branches when extra/empty missing and checkValues=false', () => {
    const filtered = {
      missing: [],
    };

    printStats('.env', '.env.example', baseStats, filtered, false, true, false);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Missing (in .env): 0'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.magenta.dim('   Duplicate keys: 1'),
    );

    // ensure no value mismatch printed
    expect(
      logSpy.mock.calls.some(([msg]: [string]) =>
        String(msg).includes('Value mismatches'),
      ),
    ).toBe(false);
  });

  it('handles undefined extra and empty safely (optional chaining branch)', () => {
    const filtered = {
      missing: [],
    };

    printStats('.env', '.env.example', baseStats, filtered, false, true, true);

    expect(logSpy).toHaveBeenCalled();
  });
});
