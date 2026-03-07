import { label, warning, error, divider, header } from '../theme.js';

/**
 * Print unused environment variables (defined in env but not used in code).
 *
 * @param unused - Array of unused variable names
 * @param comparedAgainst - File name (.env or other)
 * @param strict - Whether strict mode is enabled
 */
export function printUnused(
  unused: string[],
  comparedAgainst: string,
  strict: boolean = false,
): void {
  if (unused.length === 0) return;

  const fileType = comparedAgainst || 'environment file';
  const indicator = strict ? error('▸') : warning('▸');
  const textColor = strict ? error : warning;

  console.log();
  console.log(`${indicator} ${header(`Unused in ${fileType}`)}`);
  console.log(`${divider}`);

  for (const variable of unused) {
    console.log(`${label(variable.padEnd(26))}${textColor('Unused')}`);
  }

  console.log(`${divider}`);
}
