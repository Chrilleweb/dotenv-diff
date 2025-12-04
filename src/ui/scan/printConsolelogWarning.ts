import chalk from 'chalk';
import type { EnvUsage, VariableUsages } from '../../config/types.js';

/**
 * Print environment variables that were logged using console.log / warn / error.
 *
 * @param logged - List of EnvUsage entries where isLogged=true
 * @param json - Whether JSON output is enabled
 * @returns true if anything was printed
 */
export function printConsolelogWarning(
  logged: EnvUsage[],
  json: boolean,
): boolean {
  if (json) return false;
  if (!logged || logged.length === 0) return false;

  console.log(chalk.yellow(`⚠️  Environment variables logged to console:`));

  // Group by variable name
  const grouped = logged.reduce((acc: VariableUsages, entry: EnvUsage) => {
    if (!acc[entry.variable]) acc[entry.variable] = [];
    acc[entry.variable]!.push(entry);
    return acc;
  }, {});

  for (const [variable, usages] of Object.entries(grouped)) {
    console.log(chalk.yellow(`   - ${variable}`));

    const maxShow = 3;

    usages.slice(0, maxShow).forEach((usage) => {
      console.log(
        chalk.yellow.dim(`     Logged at: ${usage.file}:${usage.line}`),
      );
      console.log(chalk.gray(`       ${usage.context.trim()}`));
    });

    if (usages.length > maxShow) {
      console.log(
        chalk.gray(`     ... and ${usages.length - maxShow} more locations`),
      );
    }
  }

  console.log();
  return true;
}
