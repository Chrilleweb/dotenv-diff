import chalk from 'chalk';

/**
 * Print unused environment variables (defined in env but not used in code).
 *
 * @param unused - Array of unused variable names
 * @param comparedAgainst - File name (.env eller andet)
 * @param showUnused - Whether unused should be shown at all
 * @param json - Whether to output in JSON format
 */
export function printUnused(
  unused: string[],
  comparedAgainst: string,
  showUnused: boolean,
  json: boolean,
): void {
  if (json || !showUnused) return;
  if (unused.length === 0) return;

  const fileType = comparedAgainst || 'environment file';
  console.log(chalk.yellow(`⚠️  Unused in codebase (defined in ${fileType}):`));

  unused.forEach((variable) => {
    console.log(chalk.yellow(`   - ${variable}`));
  });

  console.log();
}
