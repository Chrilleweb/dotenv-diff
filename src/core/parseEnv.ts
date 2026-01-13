import fs from 'fs';

/**
 * Parses a `.env` file and returns an object with key-value pairs.
 *
 * @param path - The file path to the `.env` file.
 * @returns A record object representing parsed environment variables.
 *
 * Lines that are empty or start with `#` (comments) are ignored.
 * Multi-line or quoted values are not supported.
 */
export function parseEnvFile(path: string): Record<string, string> {
  const content = safeFileSync(path);
  const lines = content.split('\n');

  const result: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for '=' sign
    if (!trimmed.includes('=')) continue;

    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;

    result[key.trim()] = rest.join('=').trim();
  }

  return result;
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
