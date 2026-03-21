import type { ScanStats } from '../../config/types.js';
import {
  UI_LABEL_WIDTH,
  label,
  value,
  accent,
  divider,
  header,
} from '../theme.js';

/**
 * Print scan statistics for codebase scanning.
 * @param stats The scan statistics
 * @param showStats Whether to show statistics
 */
export function printStats(stats: ScanStats, showStats: boolean): void {
  if (!showStats) return;

  const row = (lbl: string, val: string | number) =>
    console.log(`${label(lbl.padEnd(UI_LABEL_WIDTH))}${value(String(val))}`);

  console.log();
  console.log(`${accent('▸')} ${header('Scan Statistics')}`);
  console.log(`${divider}`);
  row('Files scanned', stats.filesScanned);
  row('Variable references', stats.totalUsages);
  row('Unique variables', stats.uniqueVariables);
  row('Warnings', stats.warningsCount);
  row('Duration', `${stats.duration.toFixed(2)}s`);
  console.log(`${divider}`);
}
