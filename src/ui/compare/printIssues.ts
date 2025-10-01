import chalk from 'chalk';
import { type Filtered } from '../../config/types.js';

/**
 * Prints the issues found during the comparison.
 * @param filtered The filtered comparison results.
 * @param json Whether to output in JSON format.
 * @returns void
 */
export function printIssues(
  filtered: Filtered,
  json: boolean,
) {
  if (json) return;
  if (filtered.missing.length) {
    const header = chalk.red('❌ Missing keys:');
    console.log(header);
    filtered.missing.forEach((key) => console.log(chalk.red(`  - ${key}`)));
    console.log();
  }
  if (filtered.extra.length) {
    console.log(chalk.yellow('⚠️  Extra keys (not in example):'));
    filtered.extra.forEach((key) => console.log(chalk.yellow(`  - ${key}`)));
    console.log();
  }
  if (filtered.empty.length) {
    console.log(chalk.yellow('⚠️  Empty values:'));
    filtered.empty.forEach((key) => console.log(chalk.yellow(`  - ${key}`)));
    console.log();
  }
  if (filtered.mismatches.length) {
    console.log(chalk.yellow('⚠️  Value mismatches:'));
    filtered.mismatches.forEach(({ key, expected, actual }) =>
      console.log(
        chalk.yellow(`  - ${key}: expected '${expected}', but got '${actual}'`),
      ),
    );
    console.log();
  }
}