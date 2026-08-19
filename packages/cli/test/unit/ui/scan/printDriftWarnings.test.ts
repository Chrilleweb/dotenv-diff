import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printDriftWarnings } from '../../../../src/ui/scan/printDriftWarnings.js';
import type { DriftWarning } from '../../../../src/config/types.js';

describe('printDriftWarnings', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  const output = () => consoleLogSpy.mock.calls.flat().join(' ');

  it('prints nothing when there are no warnings', () => {
    printDriftWarnings([]);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('prints the header and each undocumented key', () => {
    const warnings: DriftWarning[] = [
      { key: 'STRIPE_SECRET', envFile: '.env', exampleFile: '.env.example' },
      { key: 'LEGACY_FLAG', envFile: '.env', exampleFile: '.env.example' },
    ];

    printDriftWarnings(warnings);

    expect(output()).toContain('Drift between .env and .env.example');
    expect(output()).toContain('STRIPE_SECRET');
    expect(output()).toContain('LEGACY_FLAG');
    expect(output()).toContain('not documented in .env.example');
  });

  it('names the file pair it was given', () => {
    printDriftWarnings([
      { key: 'LOCAL_ONLY', envFile: '.env.local', exampleFile: '.env.sample' },
    ]);

    expect(output()).toContain('Drift between .env.local and .env.sample');
    expect(output()).toContain('not documented in .env.sample');
  });

  it('prints a single heading for the run', () => {
    // A scan checks one env file, so there is only ever one pair to announce.
    printDriftWarnings([
      { key: 'A', envFile: '.env', exampleFile: '.env.example' },
      { key: 'B', envFile: '.env', exampleFile: '.env.example' },
    ]);

    const headers = consoleLogSpy.mock.calls
      .flat()
      .filter((line: unknown) => String(line).includes('Drift between'));
    expect(headers).toHaveLength(1);
  });

  it('still prints in strict mode (error styling branch)', () => {
    printDriftWarnings(
      [{ key: 'API_KEY', envFile: '.env', exampleFile: '.env.example' }],
      true,
    );

    expect(output()).toContain('Drift between');
    expect(output()).toContain('API_KEY');
  });
});
