import chalk from 'chalk';

/**
 * Statistics for codebase scanning
 */
interface ScanStats {
  /** Total number of files scanned during the scan process */
  filesScanned: number;
  /** Total number of environment variable references found across all scanned files */
  totalUsages: number;
  /** Total number of unique environment variables referenced across all scanned files */
  uniqueVariables: number;
  /** Total number of warnings found during the scan process */
  warningsCount: number;
  /** Total duration of the scan process in seconds */
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
  console.log(
    chalk.magenta.dim(`   Total variable references: ${stats.totalUsages}`),
  );
  console.log(
    chalk.magenta.dim(`   Unique variables: ${stats.uniqueVariables}`),
  );
  console.log(chalk.magenta.dim(`   Warnings: ${stats.warningsCount}`));
  console.log(
    chalk.magenta.dim(`   Scan duration: ${stats.duration.toFixed(2)}s`),
  );
  console.log();
}
