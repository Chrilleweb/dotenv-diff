import {
  UI_LABEL_WIDTH,
  label,
  value,
  warning,
  error,
  divider,
  header,
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
  console.log(`${label('Flag'.padEnd(UI_LABEL_WIDTH))}${error(flagName)}`);
  console.log(
    `${label('Invalid values'.padEnd(UI_LABEL_WIDTH))}${error(bad.join(', '))}`,
  );
  console.log(
    `${label('Allowed'.padEnd(UI_LABEL_WIDTH))}${value(allowed.join(', '))}`,
  );
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
  console.log(`${label('Pattern'.padEnd(UI_LABEL_WIDTH))}${error(pattern)}`);
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
    `${label('Issue'.padEnd(UI_LABEL_WIDTH))}${warning('Both --ci and --yes provided')}`,
  );
  console.log(
    `${label('Resolution'.padEnd(UI_LABEL_WIDTH))}${value('proceeding with --yes')}`,
  );
  console.log(`${divider}`);
}
