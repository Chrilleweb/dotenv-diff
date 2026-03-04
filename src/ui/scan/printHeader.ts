import { accent, label, value, divider, header } from '../theme.js';

/**
 * Prints the header for the scanning output.
 * @param comparedAgainst Optional string indicating what the codebase is being compared against.
 * @returns void
 */
export function printHeader(comparedAgainst?: string): void {
  if (!comparedAgainst) return;

  console.log();
  console.log(`${accent('▸')} ${header('dotenv-diff')}`);
  console.log(`${divider}`);
  console.log(
    `${label('Comparing against'.padEnd(26))}${value(comparedAgainst)}`,
  );
  console.log(`${divider}`);
}
