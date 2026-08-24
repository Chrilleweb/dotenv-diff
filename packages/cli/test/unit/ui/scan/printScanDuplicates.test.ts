import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printScanDuplicates } from '../../../../src/ui/scan/printScanDuplicates.js';

vi.mock('../../../../src/ui/theme.js', () => ({
  UI_LABEL_WIDTH: 28,
  padLabel: (text: string) => text,
  label: (text: string) => `L(${text})`,
  value: (text: string) => `V(${text})`,
  warning: (text: string) => `W(${text})`,
  error: (text: string) => `E(${text})`,
  divider: '---',
  header: (text: string) => `H(${text})`,
}));

describe('printScanDuplicates', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when json is true', () => {
    printScanDuplicates('.env', [{ key: 'A', count: 2 }], true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does nothing when fix is true', () => {
    printScanDuplicates('.env', [{ key: 'A', count: 2 }], false, true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does nothing when there are no duplicates', () => {
    printScanDuplicates('.env', [], false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('names the file the keys were found in', () => {
    printScanDuplicates('.env.example', [{ key: 'FEFOEOF', count: 2 }], false);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('W(▸) H(Duplicate keys in .env.example)'),
    );
    expect(logSpy).toHaveBeenCalledWith('L(FEFOEOF)V(2 occurrences)');
  });

  it('prints every duplicate key', () => {
    printScanDuplicates(
      '.env',
      [
        { key: 'A', count: 2 },
        { key: 'B', count: 3 },
      ],
      false,
    );

    expect(logSpy).toHaveBeenCalledWith('L(A)V(2 occurrences)');
    expect(logSpy).toHaveBeenCalledWith('L(B)V(3 occurrences)');
  });

  it('uses strict formatting when strict mode is enabled', () => {
    printScanDuplicates('.env', [{ key: 'A', count: 2 }], false, false, true);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('E(▸) H(Duplicate keys in .env)'),
    );
  });
});
