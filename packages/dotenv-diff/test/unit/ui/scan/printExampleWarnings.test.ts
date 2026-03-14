import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/ui/theme.js', () => ({
  label: (text: string) => `L(${text})`,
  warning: (text: string) => `W(${text})`,
  error: (text: string) => `E(${text})`,
  divider: '---',
  header: (text: string) => `H(${text})`,
}));

import { printExampleWarnings } from '../../../../src/ui/scan/printExampleWarnings.js';
import type { ExampleSecretWarning } from '../../../../src/config/types.js';

describe('printExampleWarnings', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when warnings is undefined', () => {
    printExampleWarnings(undefined as unknown as ExampleSecretWarning[]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('returns early when warnings is empty', () => {
    printExampleWarnings([]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints multiple warnings', () => {
    const warnings: ExampleSecretWarning[] = [
      {
        key: 'API_KEY',
        value: '123',
        reason: 'Looks like a real API key',
        severity: 'high',
      },
      {
        key: 'TOKEN',
        value: 'abc',
        reason: 'Suspicious token pattern',
        severity: 'medium',
      },
    ];

    printExampleWarnings(warnings);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('API_KEY'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('TOKEN'),
      ),
    ).toBe(true);
  });

  it('uses warning indicator when strict is false and no high severity exists', () => {
    const warnings: ExampleSecretWarning[] = [
      {
        key: 'TOKEN',
        value: 'abc',
        reason: 'Suspicious token pattern',
        severity: 'medium',
      },
    ];

    printExampleWarnings(warnings, false);

    expect(logSpy).toHaveBeenCalledWith(
      'W(▸) H(Potential secrets in .env.example)',
    );
  });
});
