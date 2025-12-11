import chalk from 'chalk';

interface StrictModeContext {
  unused: number;
  duplicatesEnv: number;
  duplicatesEx: number;
  secrets: number;
  exampleSecrets: number;
  hasGitignoreIssue: boolean;
  frameworkWarnings: number;
  logged: number;
  uppercaseWarnings?: number;
  expireWarnings?: number;
  inconsistentNamingWarnings?: number;
  t3EnvWarnings?: number;
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
  if (ctx.uppercaseWarnings && ctx.uppercaseWarnings > 0)
    warnings.push('uppercase environment variable keys');
  if (ctx.expireWarnings && ctx.expireWarnings > 0)
    warnings.push('expired environment variables');
  if (ctx.inconsistentNamingWarnings && ctx.inconsistentNamingWarnings > 0)
    warnings.push('inconsistent naming patterns');
  if (ctx.t3EnvWarnings && ctx.t3EnvWarnings > 0)
    warnings.push('T3 stack environment variable issues');

  if (warnings.length === 0) return false;

  console.log(
    chalk.red(`💥 Strict mode: Error on warnings → ${warnings.join(', ')}`),
  );
  console.log();

  return true;
}
