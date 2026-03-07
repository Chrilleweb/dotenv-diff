import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printAutoFix } from '../../../../src/ui/shared/printAutoFix.js';
import type { FixContext } from '../../../../src/config/types.js';

describe('printAutoFix', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseContext: FixContext = {
    fixApplied: true,
    removedDuplicates: [],
    addedEnv: [],
    gitignoreUpdated: false,
  };

  it('does nothing when json is true', () => {
    printAutoFix(baseContext, '.env', true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints full auto-fix details when changes were applied', () => {
    const context: FixContext = {
      fixApplied: true,
      removedDuplicates: ['A', 'B'],
      addedEnv: ['C'],
      gitignoreUpdated: true,
    };

    printAutoFix(context, '.env', false);

    expect(logSpy).toHaveBeenCalledWith('▸ Auto-fix');
  });

  it('does not print added keys when addedEnv is empty', () => {
    const context = {
      fixApplied: true,
      removedDuplicates: [],
      addedEnv: [],
      gitignoreUpdated: false,
    };

    printAutoFix(context, '.env', false);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('Added'),
      ),
    ).toBe(false);
  });
});
