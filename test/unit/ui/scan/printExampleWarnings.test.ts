import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
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

  it('prints a single warning', () => {
    const warnings: ExampleSecretWarning[] = [
      {
        key: 'API_KEY',
        value: '123',
        reason: 'Looks like a real API key',
        severity: 'high',
      },
    ];

    printExampleWarnings(warnings);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('🚨 Potential real secrets found in .env.example:'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('   - API_KEY = "123" → Looks like a real API key [high]'),
    );

    expect(logSpy).toHaveBeenLastCalledWith();
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
});
