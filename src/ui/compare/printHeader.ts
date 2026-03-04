import { accent, divider, header } from '../theme.js';

/**
 * Prints the header for the comparison output.
 * @param envName The name of the environment file.
 * @param exampleName The name of the example file.
 * @param json Whether to output in JSON format.
 * @returns void
 */
export function printHeader(
  envName: string,
  exampleName: string,
  json: boolean,
): void {
  if (json) return;

  console.log();
  console.log(`${accent('▸')} ${header(`Comparing ${envName} ↔ ${exampleName}`)}`);
  console.log(`${divider}`);
}
