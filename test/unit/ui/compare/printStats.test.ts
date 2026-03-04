import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printStats } from '../../../../src/ui/compare/printStats.js';
import { label, value, accent, header } from '../../../../src/ui/theme.js';

describe('printStats', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  const baseStats = {
    envCount: 5,
    exampleCount: 4,
    sharedCount: 3,
    duplicateCount: 1,
    valueMismatchCount: 2,
  };

  const baseFiltered = { missing: ['A'] };

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when json is true', () => {
    printStats('.env', '.env.example', baseStats, baseFiltered, true, true, true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does nothing when showStats is false', () => {
    printStats('.env', '.env.example', baseStats, baseFiltered, false, false, true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints full statistics with extra, empty and checkValues enabled', () => {
    const filtered = { missing: ['A'], extra: ['B'], empty: ['C'] };

    printStats('.env', '.env.example', baseStats, filtered, false, true, true);

    expect(logSpy).toHaveBeenCalledWith(`${accent('▸')} ${header('Compare Statistics')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Keys in .env'.padEnd(26))}${value('5')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Keys in .env.example'.padEnd(26))}${value('4')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Shared keys'.padEnd(26))}${value('3')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Missing in .env'.padEnd(26))}${value('1')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Extra (not in .env.example)'.padEnd(26))}${value('1')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Empty values'.padEnd(26))}${value('1')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Duplicate keys'.padEnd(26))}${value('1')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Value mismatches'.padEnd(26))}${value('2')}`);
  });

  it('skips optional branches when extra/empty missing and checkValues=false', () => {
    printStats('.env', '.env.example', baseStats, { missing: [] }, false, true, false);

    expect(logSpy).toHaveBeenCalledWith(`${label('Missing in .env'.padEnd(26))}${value('0')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Duplicate keys'.padEnd(26))}${value('1')}`);

    expect(
      logSpy.mock.calls.some(([msg]: [string]) =>
        String(msg).includes('Value mismatches'),
      ),
    ).toBe(false);
  });

  it('handles undefined extra and empty safely', () => {
    printStats('.env', '.env.example', baseStats, { missing: [] }, false, true, true);
    expect(logSpy).toHaveBeenCalled();
  });
});
