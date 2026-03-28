import type { Filtered } from '../../config/types.js';
import { label, value, accent, divider, header, padLabel } from '../theme.js';

/**
 * Interface representing the comparison statistics between two environment files
 */
interface CompareStats {
  /** Total number of keys in the environment file */
  envCount: number;
  /** Total number of keys in the example file */
  exampleCount: number;
  /** Number of keys that are shared between the environment and example files */
  sharedCount: number;
  /** Number of duplicate keys found in either file */
  duplicateCount: number;
  /** Number of keys that have mismatched values between the two files (if value checking is enabled) */
  valueMismatchCount: number;
}

/**
 * Print comparison statistics between two environment files.
 * @param envName The name of the environment file.
 * @param exampleName The name of the example file.
 * @param s The comparison statistics.
 * @param filtered The filtered keys.
 * @param json Whether to output in JSON format.
 * @param showStats Whether to show statistics.
 * @param checkValues Whether value checking is enabled.
 */
export function printStats(
  envName: string,
  exampleName: string,
  s: CompareStats,
  filtered: Pick<Filtered, 'missing' | 'extra' | 'empty'>,
  json: boolean,
  showStats: boolean,
  checkValues: boolean,
): void {
  if (json || !showStats) return;

  const row = (lbl: string, val: string | number) =>
    console.log(`${label(padLabel(lbl))}${value(String(val))}`);

  console.log();
  console.log(`${accent('▸')} ${header('Compare Statistics')}`);
  console.log(`${divider}`);
  row(`Keys in ${envName}`, s.envCount);
  row(`Keys in ${exampleName}`, s.exampleCount);
  row('Shared keys', s.sharedCount);
  row(`Missing in ${envName}`, filtered.missing.length);
  if (filtered.extra?.length) {
    row(`Extra (not in ${exampleName})`, filtered.extra.length);
  }
  if (filtered.empty?.length) {
    row('Empty values', filtered.empty.length);
  }
  row('Duplicate keys', s.duplicateCount);
  if (checkValues) {
    row('Value mismatches', s.valueMismatchCount);
  }
  console.log(`${divider}`);
}
