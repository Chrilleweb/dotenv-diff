import type { DuplicateResult, Filtered } from '../../config/types.js';

/**
 * Calculates statistics for the comparison between current and example environment files.
 * @param currentKeys - The keys from the current environment file.
 * @param exampleKeys - The keys from the example environment file.
 * @param dupsEnv - Duplicates found in the current environment file.
 * @param dupsEx - Duplicates found in the example environment file.
 * @param filtered - The filtered comparison results.
 * @param checkValues - Whether value mismatches were checked.
 * @returns An object containing various statistics about the comparison.
 */
export function calculateStats(
  currentKeys: string[],
  exampleKeys: string[],
  dupsEnv: DuplicateResult['dupsEnv'],
  dupsEx: DuplicateResult['dupsEx'],
  filtered: Filtered,
  checkValues: boolean,
) {
  const envCount = currentKeys.length;
  const exampleCount = exampleKeys.length;
  const sharedCount = new Set(
    currentKeys.filter((k) => exampleKeys.includes(k)),
  ).size;

  const duplicateCount = [...dupsEnv, ...dupsEx].reduce(
    (acc, { count }) => acc + Math.max(0, count - 1),
    0,
  );

  const valueMismatchCount = checkValues
    ? filtered.mismatches?.length ?? 0
    : 0;

  return {
    envCount,
    exampleCount,
    sharedCount,
    duplicateCount,
    valueMismatchCount,
  };
}
