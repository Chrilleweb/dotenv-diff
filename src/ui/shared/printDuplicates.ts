import { label, value, warning, error, divider, header } from '../theme.js';
import type { Duplicate } from '../../config/types.js';

/**
 * Prints duplicate keys found in the environment and example files.
 * @param envName The name of the environment file.
 * @param exampleName The name of the example file.
 * @param dEnv Array of duplicate keys in the environment file with their counts.
 * @param dEx Array of duplicate keys in the example file with their counts.
 * @param json Whether to output in JSON format.
 * @param fix Whether fix mode is enabled (skips printing duplicates as they will be fixed).
 * @param strict Whether strict mode is enabled.
 * @returns void
 */
export function printDuplicates(
  envName: string,
  exampleName: string,
  dEnv: Duplicate[],
  dEx: Duplicate[],
  json: boolean,
  fix: boolean = false,
  strict: boolean = false,
): void {
  if (json) return;

  const indicator = strict ? error('▸') : warning('▸');

  if (dEnv.length && !fix) {
    console.log();
    console.log(`${indicator} ${header(`Duplicate keys in ${envName}`)}`);
    console.log(`${divider}`);

    for (const { key, count } of dEnv) {
      console.log(`${label(key.padEnd(26))}${value(`${count} occurrences`)}`);
    }

    console.log(`${divider}`);
  }

  if (dEx.length) {
    console.log();
    console.log(`${indicator} ${header(`Duplicate keys in ${exampleName}`)}`);
    console.log(`${divider}`);

    for (const { key, count } of dEx) {
      console.log(`${label(key.padEnd(26))}${value(`${count} occurrences`)}`);
    }

    console.log(`${divider}`);
  }
}
