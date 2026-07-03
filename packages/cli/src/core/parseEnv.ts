import { splitEnvLines, parseEnvLine } from './envLine.js';

/**
 * Parses dotenv file content and returns an object with key-value pairs.
 *
 * @param content - The raw dotenv file content.
 * @returns A record object representing parsed environment variables.
 *
 * Lines that are empty or start with `#` (comments) are ignored.
 * Multi-line or quoted values are not supported.
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of splitEnvLines(content)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    result[parsed.key] = parsed.value;
  }

  return result;
}
