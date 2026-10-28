import type { UppercaseWarning } from '../config/types.js';
import { toUpperSnakeCase } from './helpers/toUpperSnakeCase.js';

/** A key in UPPER_SNAKE_CASE: uppercase letters, digits and underscores. */
const UPPER_SNAKE_CASE = /^[A-Z0-9_]+$/;

/**
 * Detects environment variable keys that are not in UPPER_SNAKE_CASE.
 * For example: `apiKey` → suggests `API_KEY`.
 * @param keys - Array of environment variable keys to analyze
 * @returns Array of uppercase warnings, each with a suggested key
 */
export function detectUppercaseKeys(keys: string[]): UppercaseWarning[] {
  return keys
    .filter((key) => !UPPER_SNAKE_CASE.test(key))
    .map((key) => ({ key, suggestion: toUpperSnakeCase(key) }));
}
