import chalk from 'chalk';

type GitignoreWarningOptions = {
  envFile: string;
  reason: 'no-gitignore' | 'not-ignored';
  log?: (msg: string) => void;
};

/**
 * Logs a warning about .env not being ignored by Git.
 * @param options - Options for the gitignore warning.
 * @returns void
 */
export function printGitignoreWarning(options: GitignoreWarningOptions): void {
  const { envFile, reason, log = console.log } = options;

  if (reason === 'no-gitignore') {
    log(
      chalk.yellow(
        `⚠️  No .gitignore found – your ${envFile} may be committed.\n` +
          `   Add:\n` +
          `     ${envFile}\n`
      ),
    );
  } else {
    log(
      chalk.yellow(
        `⚠️  ${envFile} is not ignored by Git (.gitignore).\n` +
          `   Consider adding:\n` +
          `     ${envFile}\n`
      ),
    );
  }
}
