import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printListAll } from '../../../../src/ui/scan/printListAll.js';
import type { EnvUsage } from '../../../../src/config/types.js';

const makeUsage = (variable: string): EnvUsage => ({
  variable,
  file: 'src/index.ts',
  line: 1,
  column: 1,
  pattern: 'process.env',
  context: `process.env.${variable}`,
});

describe('printListAll', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints empty message when usages is an empty array', () => {
    printListAll([]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('No environment variables found in codebase.'),
    );
  });

  it('prints header, each unique variable, and summary for a single usage', () => {
    printListAll([makeUsage('API_KEY')]);

    const calls = logSpy.mock.calls.map((call: [string]) => call[0]);

    expect(
      calls.some((c: string) =>
        c?.includes('Environment variables found in codebase'),
      ),
    ).toBe(true);
    expect(calls.some((c: string) => c?.includes('API_KEY'))).toBe(true);
    expect(calls.some((c: string) => c?.includes('1 unique variable(s)'))).toBe(
      true,
    );
  });

  it('deduplicates variables with multiple usages', () => {
    printListAll([
      makeUsage('DB_URL'),
      makeUsage('DB_URL'),
      makeUsage('DB_URL'),
    ]);

    const calls = logSpy.mock.calls.map((call: [string]) => call[0]);
    const dbUrlCalls = calls.filter((c: string) => c?.includes('DB_URL'));

    expect(dbUrlCalls).toHaveLength(1);
    expect(calls.some((c: string) => c?.includes('1 unique variable(s)'))).toBe(
      true,
    );
  });

  it('sorts variables alphabetically', () => {
    printListAll([makeUsage('ZEBRA'), makeUsage('ALPHA'), makeUsage('MIDDLE')]);

    const calls = logSpy.mock.calls.map((call: [string]) => call[0]);
    const varLines = calls.filter(
      (c: string) =>
        c?.includes('ALPHA') || c?.includes('MIDDLE') || c?.includes('ZEBRA'),
    );

    expect(varLines[0]).toContain('ALPHA');
    expect(varLines[1]).toContain('MIDDLE');
    expect(varLines[2]).toContain('ZEBRA');
  });

  it('shows correct count for multiple unique variables', () => {
    printListAll([makeUsage('FOO'), makeUsage('BAR'), makeUsage('BAZ')]);

    const calls = logSpy.mock.calls.map((call: [string]) => call[0]);
    expect(calls.some((c: string) => c?.includes('3 unique variable(s)'))).toBe(
      true,
    );
  });

  it('prints divider before and after the variable list', () => {
    printListAll([makeUsage('TOKEN')]);

    // header + divider + variable + divider + summary = 5 calls
    expect(logSpy).toHaveBeenCalledTimes(5);
  });
});
