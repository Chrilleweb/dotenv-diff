import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printDuplicates } from '../../../../src/ui/shared/printDuplicates.js';

describe('printDuplicates', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when json is true', () => {
    printDuplicates('.env', '.env.example', [], [], true);
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
    );

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('Duplicate keys in .env'),
      ),
    ).toBe(false);
  });

  it('does not print env duplicates when none exist', () => {
    printDuplicates('.env', '.env.example', [], [], false, false);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints both env and example duplicates together', () => {
    printDuplicates(
      '.env',
      '.env.example',
      [{ key: 'A', count: 2 }],
      [{ key: 'B', count: 3 }],
      false,
    );

    expect(logSpy).toHaveBeenCalled();
  });
});
