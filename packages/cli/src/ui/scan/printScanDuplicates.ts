import {
  label,
  value,
  warning,
  error,
  divider,
  header,
  padLabel,
} from '../theme.js';
import type { Duplicate } from '../../config/types.js';

/**
 * Prints duplicate keys found by a scan.
 *
 * Unlike the compare-mode printer this takes a single file, because a scan only
 * ever reads one — the header therefore always names the file the keys came
 * from, matching the `duplicates.file` field in `--json` output.
 * @param file The name of the file the duplicates were found in.
 * @param duplicates The duplicate keys with their occurrence counts.
 * @param json Whether output is in JSON format (nothing is printed then).
 * @param fix Whether fix mode is enabled (skips printing, as they will be fixed).
 * @param strict Whether strict mode is enabled.
 * @returns void
 */
export function printScanDuplicates(
  file: string,
  duplicates: Duplicate[],
  json: boolean,
  fix: boolean = false,
  strict: boolean = false,
): void {
  if (json || fix || duplicates.length === 0) return;

  const indicator = strict ? error('▸') : warning('▸');

  console.log();
  console.log(`${indicator} ${header(`Duplicate keys in ${file}`)}`);
  console.log(`${divider}`);

  for (const { key, count } of duplicates) {
    console.log(`${label(padLabel(key))}${value(`${count} occurrences`)}`);
  }

  console.log(`${divider}`);
}
