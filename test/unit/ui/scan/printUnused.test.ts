import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printUnused } from '../../../../src/ui/scan/printUnused.js';

describe('printUnused', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when unused array is empty', () => {
    printUnused([], '.env');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints unused variables with provided file name in non-strict mode', () => {
    printUnused(['API_KEY', 'JWT_SECRET'], '.env');

    expect(logSpy).toHaveBeenCalledTimes(6);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Unused in .env'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('API_KEY'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('JWT_SECRET'),
    );
  });

  it('uses fallback file label when comparedAgainst is empty', () => {
    printUnused(['SOME_VAR'], '');

    expect(logSpy).toHaveBeenCalledTimes(5);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Unused in environment file'),
    );
  });

  it('prints output in strict mode', () => {
    printUnused(['SOME_VAR'], '.env', true);

    expect(logSpy).toHaveBeenCalledTimes(5);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Unused in .env'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('SOME_VAR'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('unused'),
    );
  });
});
