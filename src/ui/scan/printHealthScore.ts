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
  let color = chalk.green;
  let emoji = '💚';
  let label = 'Excellent health';

  if (json) return false;

  if (score < 90) {
    color = chalk.yellow;
    emoji = '💛';
    label = 'Can improve';
  }
  if (score < 70) {
    color = chalk.redBright;
    emoji = '🧡';
    label = 'Needs attention';
  }
  if (score < 40) {
    color = chalk.red;
    emoji = '🚨';
    label = 'Poor health';
  }

  console.log(`${emoji} ${color('Project Health Score:')} (${score}/100)`);
  console.log(`   ${color(label)}`); 
  console.log('');
  return true;
}
