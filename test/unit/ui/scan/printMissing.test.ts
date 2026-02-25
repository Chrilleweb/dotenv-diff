import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printMissing } from '../../../../src/ui/scan/printMissing.js';
import type { EnvUsage } from '../../../../src/config/types.js';

// Mock normalizePath
vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: (p: string) => `normalized:${p}`,
}));

describe('printMissing', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when no missing variables', () => {
    const result = printMissing([], [], '.env');
    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints missing variables grouped by file', () => {
    const used: EnvUsage[] = [
      {
        variable: 'API_KEY',
        file: '/file1.ts',
        line: 10,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.API_KEY',
      },
      {
        variable: 'SECRET',
        file: '/file1.ts',
        line: 20,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.SECRET',
      },
      {
        variable: 'API_KEY',
        file: '/file2.ts',
        line: 5,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.API_KEY',
      },
    ];

    const result = printMissing(['API_KEY', 'SECRET'], used, '.env.example');

    expect(result).toBe(true);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.red('❌ Missing in .env.example:'),
    );

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('normalized:/file1.ts'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('normalized:/file2.ts'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('API_KEY: Line 10'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('SECRET: Line 20'),
      ),
    ).toBe(true);

    expect(logSpy).toHaveBeenLastCalledWith();
  });

  it('falls back to "environment file" when comparedAgainst is empty', () => {
    const used: EnvUsage[] = [
      {
        variable: 'A',
        file: '/file.ts',
        line: 1,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.A',
      },
    ];

    printMissing(['A'], used, '');

    expect(logSpy).toHaveBeenCalledWith(
      chalk.red('❌ Missing in environment file:'),
    );
  });

  it('handles variable with no usages gracefully', () => {
    const used: EnvUsage[] = [];

    const result = printMissing(['UNKNOWN'], used, '.env');

    expect(result).toBe(true);

    expect(logSpy).toHaveBeenCalledWith(chalk.red('❌ Missing in .env:'));
  });
});
