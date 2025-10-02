// src/core/helpers/isAllOk.ts
import type { Filtered } from '../../config/types.js';

/**
 * Checks if all filtered comparison results are okay (i.e., no issues found).
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
