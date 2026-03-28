import {
  label,
  value,
  warning,
  error,
  divider,
  header,
  padLabel,
} from '../theme.js';

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
  console.log();
  console.log(`${error('▸')} ${header('Invalid flag')}`);
  console.log(`${divider}`);
  console.log(`${label(padLabel('Flag'))}${error(flagName)}`);
  console.log(`${label(padLabel('Invalid values'))}${error(bad.join(', '))}`);
  console.log(`${label(padLabel('Allowed'))}${value(allowed.join(', '))}`);
  console.log(`${divider}`);
  process.exit(1);
}

/**
 * Prints an error for invalid regex patterns and exits.
 * @param pattern - The invalid regex pattern.
 */
export function printInvalidRegex(pattern: string): never {
  console.log();
  console.log(`${error('▸')} ${header('Invalid regex')}`);
  console.log(`${divider}`);
  console.log(`${label(padLabel('Pattern'))}${error(pattern)}`);
  console.log(`${divider}`);
  process.exit(1);
}

/**
 * Prints a warning when both --ci and --yes are provided.
 * @returns void
 */
export function printCiYesWarning(): void {
  console.log();
  console.log(`${warning('▸')} ${header('Flag conflict')}`);
  console.log(`${divider}`);
  console.log(
    `${label(padLabel('Issue'))}${warning('Both --ci and --yes provided')}`,
  );
  console.log(
    `${label(padLabel('Resolution'))}${value('proceeding with --yes')}`,
  );
  console.log(`${divider}`);
}
