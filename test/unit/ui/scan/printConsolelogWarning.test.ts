import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printConsolelogWarning } from '../../../../src/ui/scan/printConsolelogWarning.js';
import type { EnvUsage } from '../../../../src/config/types.js';

// Mock normalizePath
vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: (p: string) => `normalized:${p}`,
}));

describe('printConsolelogWarning', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when logged is undefined', () => {
    const result = printConsolelogWarning(undefined as any);
    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('returns false when logged is empty', () => {
    const result = printConsolelogWarning([]);
    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints single logged variable', () => {
    const logged: EnvUsage[] = [
      {
        variable: 'API_KEY',
        file: '/path/file.ts',
        line: 10,
        column: 1,
        pattern: 'process.env',
        context: 'console.log(process.env.API_KEY)',
        isLogged: true,
      },
    ];

    const result = printConsolelogWarning(logged);

    expect(result).toBe(true);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('⚠️  Environment variables logged to console:'),
    );

    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('   - API_KEY'));

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow.dim('     Logged at: normalized:/path/file.ts:10'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.gray('       console.log(process.env.API_KEY)'),
    );
  });

  it('deduplicates same file + line', () => {
    const logged: EnvUsage[] = [
      {
        variable: 'API_KEY',
        file: '/file.ts',
        line: 5,
        column: 1,
        pattern: 'process.env',
        context: 'console.log(process.env.API_KEY)',
        isLogged: true,
      },
      {
        variable: 'API_KEY',
        file: '/file.ts',
        line: 5,
        column: 2,
        pattern: 'process.env',
        context: 'console.log(process.env.API_KEY)',
        isLogged: true,
      },
    ];

    printConsolelogWarning(logged);

    // Only one location printed
    const occurrences = logSpy.mock.calls.filter((call: [string]) =>
      String(call[0]).includes('Logged at:'),
    );

    expect(occurrences.length).toBe(1);
  });

  it('limits to maxShow=3 and prints overflow message', () => {
    const logged: EnvUsage[] = Array.from({ length: 5 }).map((_, i) => ({
      variable: 'API_KEY',
      file: `/file${i}.ts`,
      line: i,
      column: 1,
      pattern: 'process.env',
      context: `console.log(${i})`,
      isLogged: true,
    }));

    printConsolelogWarning(logged);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('... and 2 more locations'),
      ),
    ).toBe(true);
  });

  it('handles multiple variables', () => {
    const logged: EnvUsage[] = [
      {
        variable: 'API_KEY',
        file: '/file.ts',
        line: 1,
        column: 1,
        pattern: 'process.env',
        context: 'log1',
        isLogged: true,
      },
      {
        variable: 'SECRET',
        file: '/file2.ts',
        line: 2,
        column: 1,
        pattern: 'process.env',
        context: 'log2',
        isLogged: true,
      },
    ];

    printConsolelogWarning(logged);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('API_KEY'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('SECRET'),
      ),
    ).toBe(true);
  });
});
