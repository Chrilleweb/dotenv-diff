import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printMissing } from '../../../../src/ui/scan/printMissing.js';
import type { EnvUsage } from '../../../../src/config/types.js';

// Mock normalizePath
vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: (p: string) => `normalized:${p}`,
}));

describe('printMissing', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when no missing variables', () => {
    const result = printMissing([], [], '.env');
    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('handles variable with no usages gracefully', () => {
    const used: EnvUsage[] = [];

    const result = printMissing(['UNKNOWN'], used, '.env');
    expect(result).toBe(true);
  });
});
