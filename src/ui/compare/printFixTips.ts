import chalk from 'chalk';
import { type Filtered } from '../../config/types.js';

/**
 * Prints tips for fixing issues found during the comparison.
 * @param filtered The filtered comparison results.
 * @param envNotIgnored Whether the .env file is not ignored by git.
 * @param json Whether to output in JSON format.
 * @param fix Whether to apply fixes.
 * @returns void
 */
export function printFixTips(
  filtered: Filtered,
  envNotIgnored: boolean,
  json: boolean,
  fix: boolean | undefined,
) {
  if (json || fix) return;

  const hasMissing = filtered.missing.length > 0;
  const hasDupEnv = filtered.duplicatesEnv.length > 0;

  let tip: string | null = null;
  if (hasMissing && hasDupEnv && envNotIgnored) {
    tip =
      '💡 Tip: Run with `--fix` to add missing keys, remove duplicates and add .env to .gitignore';
  } else if (hasMissing && hasDupEnv) {
    tip = '💡 Tip: Run with `--fix` to add missing keys and remove duplicates';
  } else if (hasDupEnv && envNotIgnored) {
    tip =
      '💡 Tip: Run with `--fix` to remove duplicate keys and add .env to .gitignore';
  } else if (hasMissing && envNotIgnored) {
    tip =
      '💡 Tip: Run with `--fix` to add missing keys and add .env to .gitignore';
  } else if (hasMissing) {
    tip = '💡 Tip: Run with `--fix` to add missing keys';
  } else if (hasDupEnv) {
    tip = '💡 Tip: Run with `--fix` to remove duplicate keys';
  } else if (envNotIgnored) {
    tip = '💡 Tip: Run with `--fix` to ensure .env is added to .gitignore';
  }

  if (tip) {
    console.log(chalk.gray(tip));
    console.log();
  }
}