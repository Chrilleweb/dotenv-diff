import type { Filtered } from '../../config/types.js';

/**
 * Checks if all filtered comparison results are okay (i.e., no issues found).
 * This is used in compare.ts to determine if the comparison passed all checks.
 * @param filtered - The filtered comparison results.
 * @returns True if all checks pass, false otherwise.
 */
export function isAllOk(filtered: Filtered): boolean {
  return (
    filtered.missing.length === 0 &&
    filtered.extra?.length === 0 &&
    filtered.empty?.length === 0 &&
    filtered.duplicatesEnv.length === 0 &&
    filtered.duplicatesEx.length === 0 &&
    filtered.mismatches?.length === 0 &&
    !filtered.gitignoreIssue
  );
}
