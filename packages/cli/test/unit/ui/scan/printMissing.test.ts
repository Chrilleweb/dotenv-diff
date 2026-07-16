import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('handles variable with no usages gracefully', () => {
    const used: EnvUsage[] = [];

    const result = printMissing(['UNKNOWN'], used, '.env');

    expect(result).toBe(true);
    expect(logSpy).toHaveBeenCalledTimes(4);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Missing in .env'),
    );
  });

  it('appends a "did you mean" hint for variables that have a suggestion', () => {
    const used: EnvUsage[] = [
      {
        variable: 'DATABASE_URL',
        file: 'src/a.ts',
        line: 3,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.DATABASE_URL',
      },
      {
        variable: 'API_KEY',
        file: 'src/b.ts',
        line: 5,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.API_KEY',
      },
    ];

    const result = printMissing(['DATABASE_URL', 'API_KEY'], used, '.env', [
      { key: 'DATABASE_URL', didYouMean: 'DATABAS_URL', distance: 1 },
    ]);

    expect(result).toBe(true);
    // Variable with a suggestion gets the hint appended.
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('→ did you mean DATABAS_URL?'),
    );
    // Variable without a suggestion has no hint on its line.
    expect(logSpy).toHaveBeenNthCalledWith(
      5,
      expect.not.stringContaining('did you mean'),
    );
  });

  it('prints one line per missing variable and falls back to environment file label', () => {
    const used: EnvUsage[] = [
      {
        variable: 'API_KEY',
        file: 'src/a.ts',
        line: 10,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.API_KEY',
      },
      {
        variable: 'API_KEY',
        file: 'src/a.ts',
        line: 12,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.API_KEY',
      },
      {
        variable: 'JWT_SECRET',
        file: 'src/b.ts',
        line: 7,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.JWT_SECRET',
      },
      {
        variable: 'UNUSED',
        file: 'src/c.ts',
        line: 1,
        column: 1,
        pattern: 'process.env',
        context: 'process.env.UNUSED',
      },
    ];

    const result = printMissing(['API_KEY', 'JWT_SECRET'], used, '');

    expect(result).toBe(true);
    expect(logSpy).toHaveBeenCalledTimes(6);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Missing in environment file'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('normalized:src/a.ts:10'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('normalized:src/b.ts:7'),
    );
  });
});
