import chalk from 'chalk';
import type { EnvUsage, VariableUsages } from '../../config/types.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';

/**
 * Print missing environment variables (used in code but not in env file).
 *
 * @param missing - List of missing variables
 * @param used - All usages found in the codebase
 * @param comparedAgainst - Name of the env file or example file
 * @param isCiMode - Whether we are in CI mode (extra error message)
 * @param json - Whether to output in JSON format
 * @returns true if any missing variables were printed
 */
export function printMissing(
  missing: string[],
  used: EnvUsage[],
  comparedAgainst: string,
  isCiMode: boolean,
  json: boolean,
): boolean {
  if (json) return false;
  if (missing.length === 0) return false;

  const fileType = comparedAgainst || 'environment file';
  console.log(chalk.red(`❌ Missing in ${fileType}:`));

  // Group by variable → find their usages
  const grouped = missing.reduce((acc: VariableUsages, variable: string) => {
    const usages = used.filter((u: EnvUsage) => u.variable === variable);
    acc[variable] = usages;
    return acc;
  }, {});

  for (const [variable, usages] of Object.entries(grouped)) {
    console.log(chalk.red(`   - ${variable}`));

    const maxShow = 3;
    usages.slice(0, maxShow).forEach((usage) => {
      const file = normalizePath(usage.file);

      console.log(chalk.red.dim(`     Used in: ${file}:${usage.line}`));
      console.log(chalk.gray(`       ${usage.context.trim()}`));
    });

    if (usages.length > maxShow) {
      console.log(
        chalk.gray(`     ... and ${usages.length - maxShow} more locations`),
      );
    }
  }
  console.log();

  if (isCiMode) {
    console.log(
      chalk.red(`💥 Found ${missing.length} missing environment variable(s).`),
    );
    console.log(
      chalk.red(`   Add these variables to ${fileType} to fix this error.`),
    );
    console.log();
  }

  return true;
}
