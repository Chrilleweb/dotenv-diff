import chalk from 'chalk';
import type { Filtered } from '../../config/types.js';

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
  duplicateCount: number; // sum of (count - 1)
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
  console.log(chalk.magenta('📊 Compare Statistics:'));
  console.log(chalk.magenta.dim(`   Keys in ${envName}: ${s.envCount}`));
  console.log(
    chalk.magenta.dim(`   Keys in ${exampleName}: ${s.exampleCount}`),
  );
  console.log(chalk.magenta.dim(`   Shared keys: ${s.sharedCount}`));
  console.log(
    chalk.magenta.dim(`   Missing (in ${envName}): ${filtered.missing.length}`),
  );
  if (filtered.extra?.length) {
    console.log(
      chalk.magenta.dim(
        `   Extra (not in ${exampleName}): ${filtered.extra.length}`,
      ),
    );
  }
  if (filtered.empty?.length) {
    console.log(chalk.magenta.dim(`   Empty values: ${filtered.empty.length}`));
  }
  console.log(chalk.magenta.dim(`   Duplicate keys: ${s.duplicateCount}`));
  if (checkValues) {
    console.log(
      chalk.magenta.dim(`   Value mismatches: ${s.valueMismatchCount}`),
    );
  }
  console.log();
}
