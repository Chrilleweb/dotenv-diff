import chalk from 'chalk';
import type { ExampleSecretWarning } from '../../core/exampleSecretDetector';

/**
 * Prints example file secret warnings to the console.
 * @param warnings - List of example file secret warnings
 * @param json - Whether to output in JSON format
 */
export function printExampleWarnings(
  warnings: ExampleSecretWarning[],
  json: boolean,
) {
  if (!warnings || warnings.length === 0) return;

  if (json) {
    console.log(JSON.stringify({ exampleWarnings: warnings }, null, 2));
    return;
  }

  console.log(chalk.yellow('🚨 Potential real secrets found in .env.example:'));
  for (const w of warnings) {
    console.log(
      chalk.yellow(`   - ${w.key} = "${w.value}" → ${w.reason} [${w.severity}]`),
    );
  }
  console.log();
}
