import chalk from 'chalk';

/**
 * Prints an error for invalid --only categories and exits.
 * @param flagName - The name of the flag.
 * @param bad - The invalid values.
 * @param allowed - The allowed values.
 */
export function printInvalidCategory(
  flagName: string,
  bad: string[],
  allowed: readonly string[],
): never {
  console.error(
    chalk.red(
      `❌ Error: invalid ${flagName} value(s): ${bad.join(', ')}.\n` +
        `   Allowed: ${allowed.join(', ')}`,
    ),
  );
  process.exit(1);
}

/**
 * Prints an error for invalid regex patterns and exits.
 * @param pattern - The invalid regex pattern.
 */
export function printInvalidRegex(pattern: string): never {
  console.error(
    chalk.red(`❌ Error: invalid --ignore-regex pattern: ${pattern}`),
  );
  process.exit(1);
}

/**
 * Prints a warning when both --ci and --yes are provided.
 */
export function printCiYesWarning(): void {
  console.log(
    chalk.yellow('⚠️  Both --ci and --yes provided; proceeding with --yes.'),
  );
}
