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
