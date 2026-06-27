import { divider, error, header, label, padLabel, value } from '../theme.js';

/**
 * Prints an error when explicitly requested matrix files cannot be found.
 * @param missing File names that do not exist relative to cwd.
 * @returns void
 */
export function printMatrixMissingFiles(missing: string[]): void {
  console.log();
  console.log(`${error('▸')} ${header('File not found')}`);
  console.log(`${divider}`);
  for (const name of missing) {
    console.log(`${label(padLabel('Missing'))}${error(name)}`);
  }
  console.log(`${divider}`);
}

/**
 * Prints an error when fewer than two files are available to compare.
 * @param count Number of files found.
 * @returns void
 */
export function printMatrixInsufficientFiles(count: number): void {
  console.log();
  console.log(`${error('▸')} ${header('Not enough files to compare')}`);
  console.log(`${divider}`);
  console.log(`${label(padLabel('Found'))}${value(String(count))}`);
  console.log(
    `${label(padLabel('Suggestion'))}${value('--matrix needs at least 2 .env* files')}`,
  );
  console.log(`${divider}`);
}
