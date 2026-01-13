import chalk from 'chalk';
import type { EnvUsage, VariableUsages } from '../../config/types.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';

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

  const grouped = logged.reduce((acc: VariableUsages, entry) => {
    if (!acc[entry.variable]) acc[entry.variable] = [];
    acc[entry.variable]!.push(entry);
    return acc;
  }, {});

  for (const [variable, usages] of Object.entries(grouped)) {
    console.log(chalk.yellow(`   - ${variable}`));

    // Deduplicate by file + line (unique locations)
    const uniqueUsages = Array.from(
      new Map(usages.map((u) => [`${u.file}:${u.line}`, u])).values(),
    );

    const maxShow = 3;

    uniqueUsages.slice(0, maxShow).forEach((usage) => {
      const normalizedFile = normalizePath(usage.file);
      console.log(
        chalk.yellow.dim(`     Logged at: ${normalizedFile}:${usage.line}`),
      );
      console.log(chalk.gray(`       ${usage.context.trim()}`));
    });

    if (uniqueUsages.length > maxShow) {
      console.log(
        chalk.gray(
          `     ... and ${uniqueUsages.length - maxShow} more locations`,
        ),
      );
    }
  }

  console.log();
  return true;
}
