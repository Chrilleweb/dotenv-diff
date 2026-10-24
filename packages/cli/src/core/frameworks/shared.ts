/**
 * Keywords that indicate a variable is sensitive and must not be exposed to
 * the browser (e.g. a public-prefixed variable containing one of these).
 */
const SENSITIVE_KEYWORDS_PATTERN = /SECRET|PRIVATE|PASSWORD/;

/**
 * Warning reason shared by all frameworks when a public variable looks like a secret
 */
export const EXPOSED_SECRET_REASON =
  'Potential sensitive environment variable exposed to the browser';

/**
 * Checks whether a variable is exposed to the browser and looks like a secret
 * @param variable - The environment variable name
 * @param publicPrefixes - Prefixes that make a variable available in the browser
 * @returns True if the variable is public and contains a sensitive keyword
 */
export function isExposedSecret(
  variable: string,
  publicPrefixes: string[],
): boolean {
  const isPublic = publicPrefixes.some((prefix) => variable.startsWith(prefix));
  return isPublic && SENSITIVE_KEYWORDS_PATTERN.test(variable);
}
