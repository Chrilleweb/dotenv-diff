import chalk from 'chalk';
import type { ExampleSecretWarning } from '../../config/types.js';

/**
 * Prints example file secret warnings to the console.
 * @param warnings - List of example file secret warnings
 */
export function printExampleWarnings(
  warnings: ExampleSecretWarning[],
): void {
  if (!warnings || warnings.length === 0) return;

  console.log(chalk.yellow('🚨 Potential real secrets found in .env.example:'));
  for (const w of warnings) {
    console.log(
      chalk.yellow(
        `   - ${w.key} = "${w.value}" → ${w.reason} [${w.severity}]`,
      ),
    );
  }
  console.log();
}
