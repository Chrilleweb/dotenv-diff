import chalk from 'chalk';
import type { EnvWarning } from '../../core/envValidator.js';

/**
 * Prints environment variable usage warnings to the console.
 * @param warnings - List of environment variable warnings
 * @param json - Whether to output in JSON format
 */
export function printEnvWarnings(warnings: EnvWarning[], json: boolean) {
  if (!warnings || warnings.length === 0) return;

  if (json) {
    console.log(JSON.stringify({ envWarnings: warnings }, null, 2));
    return;
  }

  console.log(chalk.yellow('⚠️  Environment variable usage issues:'));

  for (const w of warnings) {
    console.log(
      chalk.yellow(`   - ${w.variable} (${w.file}:${w.line}) → ${w.reason}`),
    );
  }

  console.log();
}
