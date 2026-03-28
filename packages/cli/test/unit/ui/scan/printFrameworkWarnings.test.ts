import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/ui/theme.js', () => ({
  UI_LABEL_WIDTH: 28,
  padLabel: (text: string) => text,
  label: (text: string) => `L(${text})`,
  warning: (text: string) => `W(${text})`,
  error: (text: string) => `E(${text})`,
  dim: (text: string) => `D(${text})`,
  divider: '---',
  header: (text: string) => `H(${text})`,
  wrapReason: (text: string) => `WRAP(${text})`,
}));

vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: (path: string) => `normalized:${path}`,
}));

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

    expect(logSpy).toHaveBeenCalledWith('W(▸) H(Framework issues (Next.js))');
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

    expect(logSpy).toHaveBeenCalledWith('W(▸) H(Framework issues (SvelteKit))');
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

  it('uses strict indicator and error text color in strict mode', () => {
    const warnings: FrameworkWarning[] = [
      {
        variable: 'API_KEY',
        reason: 'Not allowed in client bundle',
        file: 'src/page.ts',
        line: 7,
        framework: 'nextjs',
      },
    ];

    printFrameworkWarnings(warnings, true);

    expect(logSpy).toHaveBeenCalledWith('E(▸) H(Framework issues (Next.js))');
    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('E(WRAP(Not allowed in client bundle))'),
      ),
    ).toBe(true);
  });
});
