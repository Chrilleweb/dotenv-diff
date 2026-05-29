import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  printBaselineWritten,
  printBaselineError,
} from '../../../../src/ui/scan/printBaseline.js';

describe('printBaseline', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints success UI with filename and warning count', () => {
    printBaselineWritten(
      4,
      'C:/Users/cmn/Frontend-repos/dotenv-diff/packages/cli/dotenv-diff.baseline.json',
    );

    expect(logSpy).toHaveBeenCalledWith('▸ Baseline saved');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('dotenv-diff.baseline.json'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Warnings stored'),
    );
  });

  it('prints baseline write error UI', () => {
    printBaselineError('permission denied');

    expect(logSpy).toHaveBeenCalledWith('▸ Baseline error');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('permission denied'),
    );
  });
});
