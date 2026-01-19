import type {
  CompareJsonEntry,
  Duplicate,
  Filtered,
  GitignoreIssue ,
} from '../../config/types.js';


/**
 * Builds a CompareJsonEntry for the given comparison results.
 * @param params - The parameters for building the entry.
 * @returns A CompareJsonEntry object.
 */
export function compareJsonOutput({
  envName,
  exampleName,
  dupsEnv,
  dupsEx,
  gitignoreIssue,
  ok,
  filtered,
  stats,
}: {
  envName: string;
  exampleName: string;
  dupsEnv: Duplicate[];
  dupsEx: Duplicate[];
  gitignoreIssue: { reason: GitignoreIssue  } | null;
  ok?: boolean;
  filtered?: Filtered;
  stats?: {
    envCount: number;
    exampleCount: number;
    sharedCount: number;
  };
}): CompareJsonEntry {
  const entry: CompareJsonEntry = {
    env: envName,
    example: exampleName,
  };

  // Add stats if provided
  if (stats) {
    entry.stats = stats;
  }

  // Add filtered data if provided
  if (filtered) {
    if (filtered.missing.length > 0) {
      entry.missing = filtered.missing;
    }
    if (filtered.extra && filtered.extra.length > 0) {
      entry.extra = filtered.extra;
    }
    if (filtered.empty && filtered.empty.length > 0) {
      entry.empty = filtered.empty;
    }
    if (filtered.mismatches && filtered.mismatches.length > 0) {
      entry.valueMismatches = filtered.mismatches;
    }
  }

  if (dupsEnv.length || dupsEx.length) {
    entry.duplicates = {};
    if (dupsEnv.length) entry.duplicates.env = dupsEnv;
    if (dupsEx.length) entry.duplicates.example = dupsEx;
  }

  if (gitignoreIssue) {
    entry.gitignoreIssue = gitignoreIssue;
  }

  if (ok) {
    entry.ok = ok;
  }

  return entry;
}