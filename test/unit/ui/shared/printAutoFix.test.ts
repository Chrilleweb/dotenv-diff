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

    expect(logSpy).toHaveBeenCalledWith(chalk.green('✅ Auto-fix applied:'));

    expect(logSpy).toHaveBeenCalledWith(
      chalk.green('  - Removed 2 duplicate keys from .env: A, B'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.green('  - Added 1 missing keys to .env: C'),
    );

    expect(logSpy).toHaveBeenCalledWith(
      chalk.green('  - Added .env to .gitignore'),
    );
  });

  it('prints partial details when some arrays are empty', () => {
    const context: FixContext = {
      fixApplied: true,
      removedDuplicates: [],
      addedEnv: ['X'],
      gitignoreUpdated: false,
    };

    printAutoFix(context, '.env', false);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.green('  - Added 1 missing keys to .env: X'),
    );

    // Ensure removedDuplicates branch not triggered
    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('Removed'),
      ),
    ).toBe(false);
  });

  it('prints no changes message when fixApplied is false', () => {
    const context: FixContext = {
      fixApplied: false,
      removedDuplicates: [],
      addedEnv: [],
      gitignoreUpdated: false,
    };

    printAutoFix(context, '.env', false);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.green('✅ Auto-fix applied: no changes needed.'),
    );
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

  it('always prints trailing blank line when not json', () => {
    const context: FixContext = {
      fixApplied: false,
      removedDuplicates: [],
      addedEnv: [],
      gitignoreUpdated: false,
    };

    printAutoFix(context, '.env', false);

    // Last call should be blank line
    const lastCall = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];

    expect(lastCall).toBeUndefined();
  });
});
