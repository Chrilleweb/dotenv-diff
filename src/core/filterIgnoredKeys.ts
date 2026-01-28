/** 
 * default exclude environment variable keys (not expected in .env files)
 * But may be used in code. 
 */
export const DEFAULT_EXCLUDE_KEYS = [
  'PWD',
  'NODE_ENV',
  'VITE_MODE',
  'MODE',
  'BASE_URL',
  'PROD',
  'DEV',
  'SSR',
];

/**
 * Filters out keys that are in the ignore list or match any of the ignore regex patterns.
 * @param keys - The list of keys to filter.
 * @param ignore - The list of keys to ignore.
 * @param ignoreRegex - The list of regex patterns to ignore.
 * @returns The filtered list of keys.
 */
export function filterIgnoredKeys(
  keys: string[],
  ignore: string[],
  ignoreRegex: RegExp[],
): string[] {
  return keys.filter(
    (k) => !ignore.includes(k) && !DEFAULT_EXCLUDE_KEYS.includes(k) && !ignoreRegex.some((rx) => rx.test(k)),
  );
}
