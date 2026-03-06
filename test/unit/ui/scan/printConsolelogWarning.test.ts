import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('prints grouped variable usages in non-strict mode', () => {
    const logged: EnvUsage[] = [
      {
        variable: 'API_KEY',
        file: 'src/file.ts',
        line: 1,
        column: 1,
        pattern: 'process.env',
        context: 'log1',
        isLogged: true,
      },
      {
        variable: 'SECRET',
        file: 'src/file2.ts',
        line: 2,
        column: 1,
        pattern: 'process.env',
        context: 'log2',
        isLogged: true,
      },
    ];

    printConsolelogWarning(logged);

    expect(logSpy).toHaveBeenCalledTimes(6);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Environment variables logged to console'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('normalized:src/file.ts:1'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('normalized:src/file2.ts:2'),
    );
  });

  it('deduplicates same file:line entries and prints strict indicator path', () => {
    const logged: EnvUsage[] = [
      {
        variable: 'API_KEY',
        file: 'src/a.ts',
        line: 3,
        column: 1,
        pattern: 'process.env',
        context: 'console.log(process.env.API_KEY)',
        isLogged: true,
      },
      {
        variable: 'API_KEY',
        file: 'src/a.ts',
        line: 3,
        column: 8,
        pattern: 'process.env',
        context: 'console.warn(process.env.API_KEY)',
        isLogged: true,
      },
    ];

    const result = printConsolelogWarning(logged, true);

    expect(result).toBe(true);
    expect(logSpy).toHaveBeenCalledTimes(5);
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('normalized:src/a.ts:3'),
    );
  });

  it('prints +N more when there are more than 3 unique usages for one variable', () => {
    const logged: EnvUsage[] = [
      {
        variable: 'TOKEN',
        file: 'src/a.ts',
        line: 1,
        column: 1,
        pattern: 'process.env',
        context: 'console.log(process.env.TOKEN)',
      },
      {
        variable: 'TOKEN',
        file: 'src/b.ts',
        line: 2,
        column: 1,
        pattern: 'process.env',
        context: 'console.log(process.env.TOKEN)',
      },
      {
        variable: 'TOKEN',
        file: 'src/c.ts',
        line: 3,
        column: 1,
        pattern: 'process.env',
        context: 'console.log(process.env.TOKEN)',
      },
      {
        variable: 'TOKEN',
        file: 'src/d.ts',
        line: 4,
        column: 1,
        pattern: 'process.env',
        context: 'console.log(process.env.TOKEN)',
      },
    ];

    const result = printConsolelogWarning(logged);

    expect(result).toBe(true);
    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('+1 more'),
      ),
    ).toBe(true);
  });
});
