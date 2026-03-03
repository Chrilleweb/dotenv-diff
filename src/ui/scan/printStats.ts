import chalk from 'chalk';
import type { ScanStats } from '../../config/types.js';

const dim = chalk.hex('#555555');
const label = chalk.hex('#888888');
const value = chalk.hex('#e0e0e0').bold;
const accent = chalk.hex('#00d4aa');
const divider = dim('─'.repeat(36));

/**
 * Print scan statistics for codebase scanning.
 * @param stats The scan statistics
 * @param showStats Whether to show statistics
 */
export function printStats(
  stats: ScanStats,
  showStats: boolean,
): void {
  if (!showStats) return;

  const row = (lbl: string, val: string | number) =>
    console.log(`${label(lbl.padEnd(26))}${value(String(val))}`);

  console.log();
  console.log(`${accent('▸')} ${chalk.white.bold('Scan Statistics')}`);
  console.log(`${divider}`);
  row('Files scanned',           stats.filesScanned);
  row('Variable references',     stats.totalUsages);
  row('Unique variables',        stats.uniqueVariables);
  row('Warnings',                stats.warningsCount);
  row('Duration',                `${stats.duration.toFixed(2)}s`);
  console.log(`${divider}`);
  console.log();
}
