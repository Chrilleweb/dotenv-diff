import chalk from 'chalk';
import type { ExpireWarning } from '../../config/types.js';

/**
 * Prints expiration warnings for environment variables.
 * @param warnings Array of expiration warnings
 * @param isJson Whether to output in JSON format
 * @returns void
 */
export function printExpireWarnings(
  warnings: ExpireWarning[],
  isJson: boolean,
) {
  if (isJson) {
    return;
  }

  if (warnings.length === 0) return;

  console.log(chalk.yellow('⚠️  Expiration warnings:'));

  for (const warn of warnings) {
    const severity =
      warn.daysLeft < 0
        ? chalk.red(`EXPIRED ${Math.abs(warn.daysLeft)} days ago`)
        : warn.daysLeft === 0
          ? chalk.red('EXPIRES TODAY')
          : warn.daysLeft <= 3
            ? chalk.red(`expires in ${warn.daysLeft} days`)
            : warn.daysLeft <= 7
              ? chalk.yellow(`expires in ${warn.daysLeft} days`)
              : chalk.green(`expires in ${warn.daysLeft} days`);

    const keyLabel = chalk.yellow(`- ${warn.key.padEnd(15)}`);
    console.log(`   ${keyLabel} → ${severity} (${warn.date})`);
  }

  console.log();
}
