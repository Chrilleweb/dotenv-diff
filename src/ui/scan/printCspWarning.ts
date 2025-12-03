import chalk from 'chalk';

/**
 * Prints a warning if no CSP was detected.
 * Does NOT affect exit code – soft security warning only.
 */
export function printCspWarning(
  hasCsp: boolean | undefined,
  json: boolean,
): void {
  // JSON mode: no pretty printing
  if (json) return;

  // If CSP exists, remain silent to avoid noise
  if (hasCsp) return;

  console.log(chalk.yellow('⚠️  CSP is missing'));
  console.log(
    chalk.yellow.dim('   No Content-Security-Policy detected in your project.'),
  );
  console.log();
}
