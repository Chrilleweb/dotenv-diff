import chalk from 'chalk';

interface ScanStats {
  filesScanned: number;
  totalUsages: number;
  uniqueVariables: number;
  warningsCount: number;
  duration: number;
}

/**
 * Print scan statistics for codebase scanning.
 * @param stats The scan statistics
 * @param json Whether to output in JSON format
 * @param showStats Whether to show statistics
 */
export function printStats(
  stats: ScanStats,
  json: boolean,
  showStats: boolean,
): void {
  if (json || !showStats) return;
  console.log();
  console.log(chalk.magenta('📊 Scan Statistics:'));
  console.log(chalk.magenta.dim(`   Files scanned: ${stats.filesScanned}`));
  console.log(chalk.magenta.dim(`   Total usages found: ${stats.totalUsages}`));
  console.log(
    chalk.magenta.dim(`   Unique variables: ${stats.uniqueVariables}`),
  );
  console.log(chalk.magenta.dim(`   Warnings: ${stats.warningsCount}`));
  console.log(
    chalk.magenta.dim(`   Scan duration: ${stats.duration.toFixed(2)}s`),
  );
  console.log();
}
