import path from 'path';
import {
  label,
  value,
  accent,
  error,
  divider,
  header,
  padLabel,
} from '../theme.js';

/**
 * Prints message when dotenv-diff.config.json is successfully loaded.
 * @param filePath The path to the loaded config file
 * @returns void
 */
export function printConfigLoaded(filePath: string): void {
  const fileName = path.basename(filePath);

  console.log();
  console.log(`${accent('▸')} ${header('Config')}`);
  console.log(`${divider}`);
  console.log(`${label(padLabel('Loaded'))}${value(fileName)}`);
  console.log(`${divider}`);
}

/**
 * Prints message when dotenv-diff.config.json fails to parse.
 * @param error The thrown error
 * @returns void
 */
export function printConfigLoadError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);

  console.log();
  console.log(`${error('▸')} ${header('Config Error')}`);
  console.log(`${divider}`);
  console.log(
    `${label(padLabel('Failed to parse'))}${error('dotenv-diff.config.json')}`,
  );
  console.log(`${label(padLabel('Reason'))}${error(message)}`);
  console.log(`${divider}`);
}
