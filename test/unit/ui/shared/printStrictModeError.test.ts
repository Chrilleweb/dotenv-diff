import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printStrictModeError } from '../../../../src/ui/shared/printStrictModeError.js';

describe('printStrictModeError', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  const baseCtx = {
    unused: 0,
    duplicatesEnv: 0,
    duplicatesEx: 0,
    secrets: 0,
    exampleSecrets: 0,
    hasGitignoreIssue: false,
    frameworkWarnings: 0,
    logged: 0,
  };

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when json is true', () => {
    const result = printStrictModeError(baseCtx, true);
    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('returns false when no warnings exist', () => {
    const result = printStrictModeError(baseCtx, false);
    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints all possible warnings and returns true', () => {
    const ctx = {
      unused: 1,
      duplicatesEnv: 1,
      duplicatesEx: 1,
      secrets: 1,
      exampleSecrets: 1,
      hasGitignoreIssue: true,
      frameworkWarnings: 1,
      logged: 1,
      uppercaseWarnings: 1,
      expireWarnings: 1,
      inconsistentNamingWarnings: 1,
    };

    const result = printStrictModeError(ctx, false);

    expect(result).toBe(true);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.red(
        '💥 Strict mode: Error on warnings → ' +
          [
            'unused variables',
            'duplicate keys in env',
            'duplicate keys in example',
            'potential secrets',
            'secrets in .env.example',
            '.env not ignored by git',
            'framework specific warnings',
            'console logged environment variables',
            'uppercase environment variable keys',
            'expired environment variables',
            'inconsistent naming patterns',
          ].join(', '),
      ),
    );

    // trailing blank line
    expect(logSpy).toHaveBeenLastCalledWith();
  });

  it('does not include optional warnings when undefined or zero', () => {
    const ctx = {
      ...baseCtx,
      uppercaseWarnings: 0,
      expireWarnings: 0,
      inconsistentNamingWarnings: undefined,
    };

    const result = printStrictModeError(ctx, false);

    expect(result).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
