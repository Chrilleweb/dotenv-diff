import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/ui/theme.js', () => ({
  label: (text: string) => `L(${text})`,
  warning: (text: string) => `W(${text})`,
  error: (text: string) => `E(${text})`,
  divider: '---',
  header: (text: string) => `H(${text})`,
  wrapReason: (text: string) => `WRAP(${text})`,
}));

import { printInconsistentNamingWarning } from '../../../../src/ui/scan/printInconsistentNamingWarning.js';
import type { InconsistentNamingWarning } from '../../../../src/config/types.js';

describe('printInconsistentNamingWarning', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when warnings array is empty', () => {
    printInconsistentNamingWarning([]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints multiple inconsistent naming warnings', () => {
    const warnings: InconsistentNamingWarning[] = [
      {
        key1: 'A',
        key2: 'B',
        suggestion: 'Use A',
      },
      {
        key1: 'X',
        key2: 'Y',
        suggestion: 'Use X',
      },
    ];

    printInconsistentNamingWarning(warnings);

    expect(
      logSpy.mock.calls.some(
        (call: [string]) =>
          String(call[0]).includes('A') && String(call[0]).includes('B'),
      ),
    ).toBe(true);

    expect(
      logSpy.mock.calls.some(
        (call: [string]) =>
          String(call[0]).includes('X') && String(call[0]).includes('Y'),
      ),
    ).toBe(true);
  });

  it('uses strict indicator and error text color in strict mode', () => {
    const warnings: InconsistentNamingWarning[] = [
      {
        key1: 'API_KEY',
        key2: 'apiKey',
        suggestion: 'API_KEY',
      },
    ];

    printInconsistentNamingWarning(warnings, true);

    expect(logSpy).toHaveBeenCalledWith('E(▸) H(Inconsistent naming)');
    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('E(WRAP(Use only: API_KEY))'),
      ),
    ).toBe(true);
  });
});
