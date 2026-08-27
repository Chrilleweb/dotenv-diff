import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printDuplicates } from '../../../../src/ui/shared/printDuplicates.js';

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

describe('printDuplicates', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when json is true', () => {
    printDuplicates('.env', '.env.example', [], [], true, false, false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does not print env duplicates when fix=true', () => {
    printDuplicates(
      '.env',
      '.env.example',
      [{ key: 'A', count: 2 }],
      [],
      false,
      true,
      false,
    );

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('Duplicate keys in .env'),
      ),
    ).toBe(false);
  });

  it('does not print env duplicates when none exist', () => {
    printDuplicates('.env', '.env.example', [], [], false, false, false);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints both env and example duplicates together', () => {
    printDuplicates(
      '.env',
      '.env.example',
      [{ key: 'A', count: 2 }],
      [{ key: 'B', count: 3 }],
      false,
      false,
      false,
    );

    expect(logSpy).toHaveBeenCalled();
  });

  it('names the example file that duplicates were found in', () => {
    printDuplicates(
      '.env',
      '.env.sample',
      [],
      [{ key: 'B', count: 3 }],
      false,
      false,
      false,
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('H(Duplicate keys in .env.sample)'),
    );
  });

  it('skips example duplicates when no example file was resolved', () => {
    printDuplicates(
      '.env',
      '',
      [],
      [{ key: 'B', count: 3 }],
      false,
      false,
      false,
    );

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('uses strict formatting when strict mode is enabled', () => {
    printDuplicates(
      '.env',
      '.env.example',
      [{ key: 'A', count: 2 }],
      [{ key: 'B', count: 3 }],
      false,
      false,
      true,
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('E(▸) H(Duplicate keys in .env)'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('E(▸) H(Duplicate keys in .env.example)'),
    );
  });
});
