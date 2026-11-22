import { splitEnvLines, parseEnvLine } from './envLine.js';

/**
 * Removes one pair of matching surrounding quotes (`"…"`, `'…'` or `` `…` ``)
 * from a dotenv value, mirroring how dotenv itself reads quoted values.
 * Values that are not fully wrapped in the same quote character are returned
 * unchanged, so `"abc`, `'mixed"` and `a "b" c` keep their literal quotes.
 *
 * fx: `"postgres://x"` → `postgres://x`, `'a b'` → `a b`, `""` → ``
 *
 * @param value - The (already trimmed) raw value of a dotenv line.
 * @returns The value without its surrounding quotes.
 */
export function unquoteEnvValue(value: string): string {
  if (value.length < 2) return value;
  const quote = value[0];
  if (quote !== '"' && quote !== "'" && quote !== '`') return value;
  return value[value.length - 1] === quote ? value.slice(1, -1) : value;
}

/**
 * Parses dotenv file content and returns an object with key-value pairs.
 *
 * @param content - The raw dotenv file content.
 * @returns A record object representing parsed environment variables.
 *
 * Lines that are empty or start with `#` (comments) are ignored.
 * Surrounding quotes are stripped, so `KEY="x"` and `KEY=x` parse to the same
 * value. Multi-line values are not supported.
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of splitEnvLines(content)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    result[parsed.key] = unquoteEnvValue(parsed.value);
  }

  return result;
}
