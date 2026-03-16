import fs from 'fs';
import { parseEnvContent } from '../core/parseEnv.js';

/**
 * Parses a `.env` file and returns an object with key-value pairs.
 *
 * @param path - The file path to the `.env` file.
 * @returns A record object representing parsed environment variables.
 */
export function parseEnvFile(path: string): Record<string, string> {
  const content = safeFileSync(path);
  return parseEnvContent(content);
}

/**
 * Safely reads a file and returns its content as a string.
 * If the file does not exist or cannot be read, returns an empty string.
 *
 * @param path - The file path to read.
 * @returns The file content as a string, or an empty string if unreadable.
 */
function safeFileSync(path: string): string {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch {
    return '';
  }
}
