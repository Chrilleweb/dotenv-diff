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

  // Group by file first
  const byFile = new Map<string, Array<{ variable: string; usage: EnvUsage }>>();
  
  for (const [variable, usages] of Object.entries(grouped)) {
    for (const usage of usages) {
      const file = normalizePath(usage.file);
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file)!.push({ variable, usage });
    }
  }

  // Print grouped by file
  for (const [file, items] of byFile) {
    console.log(chalk.bold(`   ${file}`));
    
    for (const { variable, usage } of items) {
      console.log(
        chalk.red(`    ${variable}: Line ${usage.line}`),
      );
      console.log(chalk.red.dim(`    ${usage.context.trim()}`));
    }
  }
  console.log();

  return true;
}
