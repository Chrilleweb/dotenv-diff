import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printFrameworkWarnings } from '../../../../src/ui/scan/printFrameworkWarnings.js';
import type { FrameworkWarning } from '../../../../src/config/types.js';

describe('printFrameworkWarnings', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when warnings is undefined', () => {
    printFrameworkWarnings(undefined as unknown as FrameworkWarning[]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('returns early when warnings is empty', () => {
    printFrameworkWarnings([]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints warnings for Next.js framework', () => {
    const warnings: FrameworkWarning[] = [
      {
        variable: 'API_KEY',
        reason: 'Not allowed in client bundle',
        file: 'file.ts',
        line: 10,
        framework: 'nextjs',
      },
    ];

    printFrameworkWarnings(warnings);

    expect(logSpy).toHaveBeenCalledWith(
      ('▸ Framework issues (Next.js)'),
    );
  });

  it('prints warnings for SvelteKit framework', () => {
    const warnings: FrameworkWarning[] = [
      {
        variable: 'SECRET',
        reason: 'Private env exposed',
        file: 'file.ts',
        line: 5,
        framework: 'sveltekit',
      },
    ];

    printFrameworkWarnings(warnings);

    expect(logSpy).toHaveBeenCalledWith(
      ('▸ Framework issues (SvelteKit)'),
    );
  });

  it('deduplicates identical warnings', () => {
    const warnings: FrameworkWarning[] = [
      {
        variable: 'API_KEY',
        reason: 'Issue',
        file: 'file.ts',
        line: 1,
        framework: 'nextjs',
      },
      {
        variable: 'API_KEY',
        reason: 'Issue',
        file: 'file.ts',
        line: 1,
        framework: 'nextjs',
      },
    ];

    printFrameworkWarnings(warnings);

    const occurrences = logSpy.mock.calls.filter((call: [string]) =>
      String(call[0]).includes('API_KEY'),
    );

    expect(occurrences.length).toBe(1);
  });
});
