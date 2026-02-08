import chalk from 'chalk';

/**
 * Options for printing progress in the console.
 */
interface ProgressOptions {
  /** Whether to output in JSON format (if true, progress will not be printed) */
  isJson: boolean;
  /** The current progress count (e.g., number of files scanned) */
  current: number;
  /** The total count for completion (e.g., total number of files to scan) */
  total: number;
  /** Optional label to display alongside the progress bar (default: 'Scanning') */
  label?: string;
}

/** Internal flag to track if the progress bar has been rendered at least once */
let hasRendered = false;

/**
 * Prints a progress bar to stdout.
 * Overwrites the same line using carriage return.
 * @param options - Progress options including current, total, and label.
 * @returns void
 */
export function printProgress(options: ProgressOptions): void {
  if (options.isJson) return;
  if (!hasRendered) {
    process.stdout.write('\n');
    hasRendered = true;
  }

  const { current, total, label = 'Scanning' } = options;

  if (total <= 0) return;

  const clampedCurrent = Math.min(current, total);
  const ratio = clampedCurrent / total;
  const percentage = Math.floor(ratio * 100);

  const barLength = 30;
  const filledLength = Math.round(ratio * barLength);

  const filledBar = chalk.green('█'.repeat(filledLength));
  const emptyBar = chalk.dim('░'.repeat(barLength - filledLength));
  const bar = filledBar + emptyBar;

  const percentLabel = chalk.yellow(
    `${percentage.toString().padStart(3, ' ')}%`,
  );
  const countLabel = chalk.dim(`(${clampedCurrent}/${total} files)`);

  process.stdout.write(
    `\r${chalk.cyan('🔍 ' + label)} ${chalk.dim('▸')} [${bar}] ${percentLabel} ${countLabel}`,
  );

  if (clampedCurrent === total) {
    process.stdout.write('\n');
    hasRendered = false;
  }
}
