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
  // Strip UTF-8 BOM if present to prevent corrupting the first key
  const cleaned = content.startsWith('\uFEFF') ? content.slice(1) : content;
  const lines = cleaned.split('\n');

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
