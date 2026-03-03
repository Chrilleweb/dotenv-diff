import type { UppercaseWarning } from '../../config/types.js';
import { label, value, error, divider, header, warning } from '../theme.js';

/**
 * Print warnings for environment variable keys that are not uppercase.
 *
 * @param warnings - List of non-uppercase env keys
 * @param comparedAgainst - The .env file name being checked
 * @param strict - Whether strict mode is enabled
 */
export function printUppercaseWarning(
  warnings: UppercaseWarning[],
  comparedAgainst: string,
  strict = false,
): void {
  if (warnings.length === 0) return;

  const indicator = strict ? error('▸') : warning('▸');

  console.log();
  console.log(`${indicator} ${header(`Uppercase warnings (${comparedAgainst})`)}`);
  console.log(`${divider}`);

  for (const w of warnings) {
    console.log(`${label(w.key.padEnd(26))}${value(w.suggestion)}`);
  }

  console.log(`${divider}`);
}
