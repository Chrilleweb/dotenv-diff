import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
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
});
