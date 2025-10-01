// src/core/helpers/updateTotals.ts
import type { CompareJsonEntry } from '../../config/types.js';
import type { Filtered } from '../../config/types.js';

export interface Totals {
  missing: number;
  extra: number;
  empty: number;
  mismatch: number;
  duplicate: number;
  gitignore: number;
};

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

  if (filtered.extra.length) {
    entry.extra = filtered.extra;
    totals.extra += filtered.extra.length;
  }

  if (filtered.empty.length) {
    entry.empty = filtered.empty;
    totals.empty += filtered.empty.length;
  }

  if (filtered.mismatches.length) {
    entry.valueMismatches = filtered.mismatches;
    totals.mismatch += filtered.mismatches.length;
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
