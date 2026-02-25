import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printGitignoreWarning } from '../../../../src/ui/shared/printGitignore.js';
import { GITIGNORE_ISSUES } from '../../../../src/config/constants.js';

describe('printGitignoreWarning', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints NO_GITIGNORE warning using default console.log', () => {
    printGitignoreWarning({
      envFile: '.env',
      reason: GITIGNORE_ISSUES.NO_GITIGNORE,
    });

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow(
        `⚠️  No .gitignore found – your .env may be committed.\n` +
          `   Add:\n` +
          `     .env\n`,
      ),
    );
  });

  it('prints NOT_IGNORED warning when reason is different', () => {
    printGitignoreWarning({
      envFile: '.env',
      reason: GITIGNORE_ISSUES.NOT_IGNORED,
    });

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow(
        `⚠️  .env is not ignored by Git (.gitignore).\n` +
          `   Consider adding:\n` +
          `     .env\n`,
      ),
    );
  });

  it('uses custom log function when provided', () => {
    const customLog = vi.fn();

    printGitignoreWarning({
      envFile: '.env',
      reason: GITIGNORE_ISSUES.NOT_IGNORED,
      log: customLog,
    });

    expect(customLog).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
