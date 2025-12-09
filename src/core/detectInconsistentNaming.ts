import type { InconsistentNamingWarning } from '../config/types.js';

/**
 * Detects inconsistent naming patterns in environment variable keys.
 * For example: API_KEY vs APIKEY, DATABASE_URL vs DATABASEURL, etc.
 * @param keys - Array of environment variable keys to analyze
 * @returns Array of inconsistent naming warnings
 */
export function detectInconsistentNaming(
  keys: string[],
): InconsistentNamingWarning[] {
  const warnings: InconsistentNamingWarning[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const key1 = keys[i];
      const key2 = keys[j];

      // Skip if either key is undefined
      if (!key1 || !key2) continue;

      // Create a sorted pair key to avoid duplicate checking
      const pairKey = [key1, key2].sort().join('|');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      if (areInconsistentlyNamed(key1, key2)) {
        // Always suggest the snake_case version (the one with underscores)
        const snakeCaseKey = key1.includes('_') ? key1 : key2;
        const suggestion = `Consider using snake_case naming: '${snakeCaseKey}'`;

        warnings.push({
          key1,
          key2,
          suggestion,
        });
      }
    }
  }

  return warnings;
}

/**
 * Determines if two keys have inconsistent naming patterns.
 * @param key1 - First key to compare
 * @param key2 - Second key to compare
 * @returns True if the keys are inconsistently named
 */
function areInconsistentlyNamed(key1: string, key2: string): boolean {
  // Convert both to lowercase for comparison
  const normalized1 = key1.toLowerCase().replace(/_/g, '');
  const normalized2 = key2.toLowerCase().replace(/_/g, '');

  // Check if they are the same when underscores are removed
  if (normalized1 === normalized2 && key1 !== key2) {
    return true;
  }

  // Check for common patterns like API_KEY vs APIKEY
  const withoutUnderscores1 = key1.replace(/_/g, '');
  const withoutUnderscores2 = key2.replace(/_/g, '');

  if (
    withoutUnderscores1.toLowerCase() === withoutUnderscores2.toLowerCase() &&
    key1 !== key2
  ) {
    return true;
  }

  // Check for partial matches that might indicate inconsistency
  // e.g., DATABASE_URL vs DATABASEURL, JWT_SECRET vs JWTSECRET
  return false;
}
