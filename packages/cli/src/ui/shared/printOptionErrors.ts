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
  console.error();
  console.error(`${error('▸')} ${header('Invalid flag')}`);
  console.error(`${divider}`);
  console.error(`${label(padLabel('Flag'))}${error(flagName)}`);
  console.error(`${label(padLabel('Invalid values'))}${error(bad.join(', '))}`);
  console.error(`${label(padLabel('Allowed'))}${value(allowed.join(', '))}`);
  console.error(`${divider}`);
  process.exit(1);
}

/**
 * Prints an error for invalid regex patterns and exits.
 * @param pattern - The invalid regex pattern.
 */
export function printInvalidRegex(pattern: string): never {
  console.error();
  console.error(`${error('▸')} ${header('Invalid regex')}`);
  console.error(`${divider}`);
  console.error(`${label(padLabel('Pattern'))}${error(pattern)}`);
  console.error(`${divider}`);
  process.exit(1);
}

/**
 * Prints a warning when both --ci and --yes are provided.
 * @returns void
 */
export function printCiYesWarning(): void {
  console.error();
  console.error(`${warning('▸')} ${header('Flag conflict')}`);
  console.error(`${divider}`);
  console.error(
    `${label(padLabel('Issue'))}${warning('Both --ci and --yes provided')}`,
  );
  console.error(
    `${label(padLabel('Resolution'))}${value('proceeding with --yes')}`,
  );
  console.error(`${divider}`);
}
