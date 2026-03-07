import { accent, warning, error, divider, header } from '../theme.js';
import chalk from 'chalk';

/**
 * Print the health score of the project based on scan results.
 * @param score - The health score (0-100).
 * @param json - Whether to output in JSON format.
 * @returns Whether the health score was printed.
 */
export function printHealthScore(
  score: number,
  json: boolean = false,
): boolean {
  if (json) return false;

  const [indicator, scoreColor, lbl] =
    score >= 90
      ? [accent('▸'), accent, 'Excellent health']
      : score >= 70
        ? [warning('▸'), warning, 'Can improve']
        : score >= 40
          ? [error('▸'), error, 'Needs attention']
          : [error('▸'), error, 'Poor health'];

  console.log();
  console.log(`${indicator} ${header('Project Health Score')}`);
  console.log(`${divider}`);
  console.log(
    `${chalk.hex('#888888')('Score'.padEnd(26))}${scoreColor(`${score}/100`)}`,
  );
  console.log(`${chalk.hex('#888888')('Status'.padEnd(26))}${scoreColor(lbl)}`);
  console.log(`${divider}`);
  console.log();

  return true;
}
