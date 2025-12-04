import chalk from 'chalk';
import { type Filtered } from '../../config/types.js';

interface CompareStats {
  envCount: number;
  exampleCount: number;
  sharedCount: number;
  duplicateCount: number; // sum of (count - 1)
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
 */
export function printStats(
  envName: string,
  exampleName: string,
  s: CompareStats,
  filtered: Pick<Filtered, 'missing' | 'extra' | 'empty'>,
  json: boolean,
  showStats: boolean,
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
  console.log(
    chalk.magenta.dim(`   Value mismatches: ${s.valueMismatchCount}`),
  );
  console.log();
}
