import path from 'path';
import { label, value, error, divider, header, padLabel } from '../theme.js';

/**
 * Prints error messages if env/example files are missing.
 * @param envExists Whether the env file exists
 * @param exExists Whether the example file exists
 * @param envFlag The path to the env file
 * @param exampleFlag The path to the example file
 */
export function printErrorNotFound(
  envExists: boolean,
  exExists: boolean,
  envFlag: string,
  exampleFlag: string,
): void {
  if (envExists && exExists) return;

  console.log();
  console.log(`${error('▸')} ${header('File not found')}`);
  console.log(`${divider}`);

  if (!envExists) {
    console.log(
      `${label(padLabel('Missing env'))}${error(path.basename(envFlag))}`,
    );
  }
  if (!exExists) {
    console.log(
      `${label(padLabel('Missing example'))}${error(path.basename(exampleFlag))}`,
    );
  }

  console.log(
    `${label(padLabel('Suggestion'))}${value('ensure both files exist before comparing')}`,
  );
  console.log(`${divider}`);
}
