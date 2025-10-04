import chalk from 'chalk';
import type { EnvUsage, VariableUsages } from '../../config/types.js';

/**
 * Print all unique variables and their usage locations.
 *
 * @param usages - Array of environment variable usages
 * @param showStats - Whether to show usage details (files/lines)
 * @param json - Whether to output in JSON format
 */
export function printVariables(
  usages: EnvUsage[],
  showStats: boolean,
  json: boolean,
): void {
  if (json) return;
  if (usages.length === 0) return;

  // Group by variable
  const variableUsages = usages.reduce(
    (acc: VariableUsages, usage: EnvUsage) => {
      if (!acc[usage.variable]) {
        acc[usage.variable] = [];
      }
      acc[usage.variable]!.push(usage);
      return acc;
    },
    {},
  );

  // Display each unique variable
  for (const [variable, variableUsageList] of Object.entries(variableUsages)) {
    console.log(chalk.blue(`   ${variable}`));

    if (showStats) {
      const displayUsages = variableUsageList.slice(0, 2);

      displayUsages.forEach((usage: EnvUsage) => {
        console.log(
          chalk.blue.dim(
            `     Used in: ${usage.file}:${usage.line} (${usage.pattern})`,
          ),
        );
      });

      if (variableUsageList.length > 2) {
        console.log(
          chalk.gray(
            `     ... and ${variableUsageList.length - 2} more locations`,
          ),
        );
      }
    }
  }
  console.log();
}
