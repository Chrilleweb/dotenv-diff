import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printSecrets } from '../../../../src/ui/scan/printSecrets.js';
import type { SecretFinding } from '../../../../src/core/security/secretDetectors.js';

// Mock normalizePath
vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: (p: string) => `normalized:${p}`,
}));

describe('printSecrets', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when secrets is undefined', () => {
    printSecrets(undefined as unknown as SecretFinding[]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('returns early when secrets is empty', () => {
    printSecrets([]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints secrets sorted by severity and grouped by file', () => {
    const secrets: SecretFinding[] = [
      {
        file: '/a.ts',
        line: 5,
        kind: 'pattern',
        message: 'Low issue',
        snippet: 'low snippet',
        severity: 'low',
      },
      {
        file: '/a.ts',
        line: 1,
        kind: 'entropy',
        message: 'High issue',
        snippet: 'high snippet',
        severity: 'high',
      },
      {
        file: '/b.ts',
        line: 2,
        kind: 'pattern',
        message: 'Medium issue',
        snippet: 'medium snippet',
        severity: 'medium',
      },
    ];

    printSecrets(secrets);

    // Header printed
    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('🔒 Potential secrets detected in codebase:'),
    );

    // Files grouped and normalized
    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('normalized:/a.ts'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('normalized:/b.ts'),
      ),
    ).toBe(true);

    // Severity labels present
    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('HIGH: Line 1'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('MEDIUM: Line 2'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('LOW: Line 5'),
      ),
    ).toBe(true);

    expect(logSpy).toHaveBeenLastCalledWith();
  });

  it('covers default severity branch via cast', () => {
    const secrets: SecretFinding[] = [
      {
        file: '/x.ts',
        line: 1,
        kind: 'pattern',
        message: 'Weird issue',
        snippet: 'weird snippet',
        severity: 'strange' as any, // force default branch
      },
    ];

    printSecrets(secrets);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('STRANGE'),
      ),
    ).toBe(true);
  });
});
