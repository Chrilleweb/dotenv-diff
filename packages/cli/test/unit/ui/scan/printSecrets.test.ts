import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printSecrets } from '../../../../src/ui/scan/printSecrets.js';
import type {
  SecretFinding,
  SecretSeverity,
} from '../../../../src/core/security/secretDetectors.js';

// Mock normalizePath
vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: (p: string) => `normalized:${p}`,
}));

vi.mock('../../../../src/ui/theme.js', () => ({
  UI_LABEL_WIDTH: 28,
  padLabel: (text: string) => text,
  label: (text: string) => `L(${text})`,
  accent: (text: string) => `A(${text})`,
  warning: (text: string) => `W(${text})`,
  error: (text: string) => `E(${text})`,
  divider: '---',
  header: (text: string) => `H(${text})`,
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
  });

  it('covers default severity branch via cast', () => {
    const secrets: SecretFinding[] = [
      {
        file: '/x.ts',
        line: 1,
        kind: 'pattern',
        message: 'Weird issue',
        snippet: 'weird snippet',
        severity: 'strange' as SecretSeverity, // force default branch
      },
    ];

    printSecrets(secrets);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('STRANGE'),
      ),
    ).toBe(true);
  });

  it('uses strict indicator when strict mode is enabled', () => {
    const secrets: SecretFinding[] = [
      {
        file: '/strict.ts',
        line: 3,
        kind: 'pattern',
        message: 'Strict issue',
        snippet: 'strict snippet',
        severity: 'high',
      },
    ];

    printSecrets(secrets, true);

    expect(logSpy).toHaveBeenCalledWith('E(▸) H(Potential secrets detected)');
  });
});
