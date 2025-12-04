import chalk from 'chalk';

export interface StrictModeContext {
  unused: number;
  duplicatesEnv: number;
  duplicatesEx: number;
  secrets: number;
  exampleSecrets: number;
  hasGitignoreIssue: boolean;
  frameworkWarnings: number;
  logged: number;
}

/**
 * Prints a strict-mode error if warnings exist.
 *
 * @param ctx - Counts of warnings/issues
 * @param json - Whether to output in JSON format
 * @returns true if exitWithError should be set
 */
export function printStrictModeError(
  ctx: StrictModeContext,
  json: boolean,
): boolean {
  if (json) return false;

  const warnings: string[] = [];

  if (ctx.unused > 0) warnings.push('unused variables');
  if (ctx.duplicatesEnv > 0) warnings.push('duplicate keys in env');
  if (ctx.duplicatesEx > 0) warnings.push('duplicate keys in example');
  if (ctx.secrets > 0) warnings.push('potential secrets');
  if (ctx.exampleSecrets > 0) warnings.push('secrets in .env.example');
  if (ctx.hasGitignoreIssue) warnings.push('.env not ignored by git');
  if (ctx.frameworkWarnings > 0) warnings.push('framework specific warnings');
  if (ctx.logged > 0) warnings.push('console logged environment variables');

  if (warnings.length === 0) return false;

  console.log(
    chalk.red(`💥 Strict mode: Error on warnings → ${warnings.join(', ')}`),
  );
  console.log();

  return true;
}
