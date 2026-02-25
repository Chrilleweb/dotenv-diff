import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import fs from 'fs';
import { printMissingExample } from '../../../../src/ui/scan/printMissingExample.js';
import type { ScanUsageOptions } from '../../../../src/config/types.js';

// Mock resolveFromCwd
vi.mock('../../../../src/core/helpers/resolveFromCwd.js', () => ({
  resolveFromCwd: (_cwd: string, p: string) => `/abs/${p}`,
}));

describe('printMissingExample', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let existsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    existsSpy = vi.spyOn(fs, 'existsSync');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseOpts: ScanUsageOptions = {
    cwd: '/root',
    include: [],
    exclude: [],
    ignore: [],
    ignoreRegex: [],
    secrets: false,
    json: false,
  };

  it('returns false if examplePath is not provided', () => {
    const result = printMissingExample({
      ...baseOpts,
      examplePath: undefined,
    });

    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('returns false if example file exists', () => {
    existsSpy.mockReturnValue(true);

    const result = printMissingExample({
      ...baseOpts,
      examplePath: 'test.env',
    });

    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints red and returns true in CI mode when missing', () => {
    existsSpy.mockReturnValue(false);

    const result = printMissingExample({
      ...baseOpts,
      examplePath: 'test.env',
      isCiMode: true,
    });

    expect(result).toBe(true);

    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.red('❌ Missing example file: test.env'),
    );
  });

  it('prints yellow and returns false when missing and not CI', () => {
    existsSpy.mockReturnValue(false);

    const result = printMissingExample({
      ...baseOpts,
      examplePath: 'test.env',
      isCiMode: false,
      json: false,
    });

    expect(result).toBe(false);

    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.yellow('⚠️  Missing example file: test.env'),
    );
  });

  it('prints nothing (except blank line) when missing and json=true', () => {
    existsSpy.mockReturnValue(false);

    const result = printMissingExample({
      ...baseOpts,
      examplePath: 'test.env',
      isCiMode: false,
      json: true,
    });

    expect(result).toBe(false);

    // Only blank line should be printed
    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
