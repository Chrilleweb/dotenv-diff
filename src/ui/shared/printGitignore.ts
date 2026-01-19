import chalk from 'chalk';
import type { GitignoreIssue } from '../../config/types.js';
import { GITIGNORE_ISSUES } from '../../config/constants.js';

interface GitignoreWarningOptions {
  envFile: string;
  reason: GitignoreIssue;
  log?: (msg: string) => void;
}

/**
 * Logs a warning about .env not being ignored by Git.
 * @param options - Options for the gitignore warning.
 * @returns void
 */
export function printGitignoreWarning(options: GitignoreWarningOptions): void {
  const { envFile, reason, log = console.log } = options;

  if (reason === GITIGNORE_ISSUES.NO_GITIGNORE) {
    log(
      chalk.yellow(
        `⚠️  No .gitignore found – your ${envFile} may be committed.\n` +
          `   Add:\n` +
          `     ${envFile}\n`,
      ),
    );
  } else {
    log(
      chalk.yellow(
        `⚠️  ${envFile} is not ignored by Git (.gitignore).\n` +
          `   Consider adding:\n` +
          `     ${envFile}\n`,
      ),
    );
  }
}
