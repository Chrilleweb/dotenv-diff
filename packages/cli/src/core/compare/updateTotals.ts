import type { CompareJsonEntry, Filtered } from '../../config/types.js';

/**
 * Totals of issues found during comparison --compare operation
 */
export interface Totals {
  /** Number of missing keys */
  missing: number;
  /** Number of extra keys */
  extra: number;
  /** Number of empty keys */
  empty: number;
  /** Number of duplicate keys */
  duplicate: number;
  /** Number of gitignore issues */
  gitignore: number;
}

/**
 * Update totals and entry fields based on filtered issues.
 * Returns true if any issue requires exitWithError.
 * @param filtered filtered issues
 * @param totals overall totals
 * @param entry current entry to update
 * @returns exitWithError
 */
export function updateTotals(
  filtered: Filtered,
  totals: Totals,
  entry: CompareJsonEntry,
): boolean {
  let exitWithError = false;

  if (filtered.missing.length) {
    entry.missing = filtered.missing;
    totals.missing += filtered.missing.length;
    exitWithError = true;
  }

  if (filtered.extra?.length) {
    entry.extra = filtered.extra;
    totals.extra += filtered.extra.length;
  }

  if (filtered.empty?.length) {
    entry.empty = filtered.empty;
    totals.empty += filtered.empty.length;
  }

  if (filtered.duplicatesEnv.length || filtered.duplicatesEx.length) {
    totals.duplicate +=
      filtered.duplicatesEnv.length + filtered.duplicatesEx.length;
  }

  if (filtered.gitignoreIssue) {
    totals.gitignore += 1;
  }

  return exitWithError;
}
