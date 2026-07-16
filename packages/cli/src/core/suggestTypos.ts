import type { TypoSuggestion } from '../config/types.js';
import { MAX_TYPO_DISTANCE, MAX_TYPO_RATIO } from '../config/constants.js';
import { levenshtein } from './helpers/levenshtein.js';

/**
 * Cross-references reported keys against a pool of existing candidate keys and
 * suggests the closest match when a key looks like a simple typo of another.
 *
 * This powers the "did you mean DATABASE_URL? (found DATABAS_URL)" hints for:
 *  - compare mode: keys missing from the current file vs. the extra keys it has
 *  - scan mode: variables used in code but not defined vs. the keys that are defined
 *
 * A candidate only qualifies when it is within {@link MAX_TYPO_DISTANCE} edits and
 * within {@link MAX_TYPO_RATIO} of the longer key's length, so short unrelated keys
 * are not matched against each other. Only the single closest candidate is returned
 * per reported key.
 *
 * @param reportedKeys - Keys reported as missing / undefined
 * @param candidateKeys - Existing keys that a reported key may be a typo of
 * @returns One suggestion per reported key that has a likely match
 */
export function suggestTypos(
  reportedKeys: string[],
  candidateKeys: string[],
): TypoSuggestion[] {
  if (reportedKeys.length === 0 || candidateKeys.length === 0) return [];

  const suggestions: TypoSuggestion[] = [];

  for (const key of reportedKeys) {
    const match = findClosestKey(key, candidateKeys);
    if (match) {
      suggestions.push({
        key,
        didYouMean: match.key,
        distance: match.distance,
      });
    }
  }

  return suggestions;
}

/**
 * Finds the closest candidate key to `key` that qualifies as a likely typo.
 * @param key - The reported key to match against
 * @param candidateKeys - Existing keys to compare with
 * @returns The closest qualifying candidate and its distance, or null if none qualify
 */
function findClosestKey(
  key: string,
  candidateKeys: string[],
): { key: string; distance: number } | null {
  let best: { key: string; distance: number } | null = null;

  for (const candidate of candidateKeys) {
    if (candidate === key) continue;

    const distance = levenshtein(key, candidate);
    if (!isLikelyTypo(key, candidate, distance)) continue;

    // Keep the smallest distance; ties resolve to the first candidate seen.
    if (best === null || distance < best.distance) {
      best = { key: candidate, distance };
    }
  }

  return best;
}

/**
 * Determines whether `candidate` is close enough to `key` to be a likely typo.
 * @param key - The reported key
 * @param candidate - The existing key being compared
 * @param distance - The Levenshtein distance between the two keys
 * @returns True when the distance is within both the absolute and length-scaled thresholds
 */
function isLikelyTypo(
  key: string,
  candidate: string,
  distance: number,
): boolean {
  if (distance === 0 || distance > MAX_TYPO_DISTANCE) return false;

  const longest = Math.max(key.length, candidate.length);
  return distance / longest <= MAX_TYPO_RATIO;
}
