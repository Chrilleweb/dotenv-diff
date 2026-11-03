import path from 'path';
import type { TypoSuggestion } from '../../config/types.js';
import {
  label,
  value,
  accent,
  error,
  warning,
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

  console.error();
  console.error(`${accent('▸')} ${header('Config')}`);
  console.error(`${divider}`);
  console.error(`${label(padLabel('Loaded'))}${value(fileName)}`);
  console.error(`${divider}`);
}

/**
 * Prints message when dotenv-diff.config.json fails to parse.
 * @param error The thrown error
 * @returns void
 */
export function printConfigLoadError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);

  console.error();
  console.error(`${error('▸')} ${header('Config Error')}`);
  console.error(`${divider}`);
  console.error(
    `${label(padLabel('Failed to parse'))}${error('dotenv-diff.config.json')}`,
  );
  console.error(`${label(padLabel('Reason'))}${error(message)}`);
  console.error(`${divider}`);
}

/**
 * Prints a warning for unknown keys in dotenv-diff.config.json.
 * @param keys The unknown keys
 * @param suggestions Closest known key for keys that look like typos
 * @returns void
 */
export function printConfigUnknownKeys(
  keys: string[],
  suggestions: TypoSuggestion[],
): void {
  console.error();
  console.error(`${warning('▸')} ${header('Config Warning')}`);
  console.error(`${divider}`);
  for (const key of keys) {
    const match = suggestions.find((s) => s.key === key);
    const hint = match ? ` (did you mean ${value(match.didYouMean)}?)` : '';
    console.error(`${label(padLabel('Unknown key'))}${warning(key)}${hint}`);
  }
  console.error(`${divider}`);
}
