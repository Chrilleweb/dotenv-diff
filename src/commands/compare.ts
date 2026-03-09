import fs from 'fs';
import path from 'path';
import { diffEnv } from '../core/diffEnv.js';
import { checkGitignoreStatus } from '../services/git.js';
import { findDuplicateKeys } from '../core/duplicates.js';
import type {
  Category,
  ComparisonOptions,
  FilePair,
  ExitResult,
  Filtered,
  DuplicateResult,
} from '../config/types.js';
import { parseAndFilterEnv } from '../core/compare/parseAndFilterEnv.js';
import { updateTotals } from '../core/compare/updateTotals.js';
import { applyFixes } from '../core/fixEnv.js';
import { printFixTips } from '../ui/shared/printFixTips.js';
import { printStats } from '../ui/compare/printStats.js';
import { printDuplicates } from '../ui/shared/printDuplicates.js';
import { printHeader } from '../ui/compare/printHeader.js';
import { printAutoFix } from '../ui/shared/printAutoFix.js';
import { printIssues } from '../ui/compare/printIssues.js';
import { printGitignoreWarning } from '../ui/shared/printGitignore.js';
import { compareJsonOutput } from '../ui/compare/compareJsonOutput.js';
import { printErrorNotFound } from '../ui/compare/printErrorNotFound.js';
import { calculateStats } from '../core/compare/calculateStats.js';

/**
 * Compares multiple pairs of .env and .env.example files.
 * @param pairs - The pairs of environment files to compare.
 * @param opts - The comparison options.
 * @returns An object indicating the overall comparison results.
 */
export async function compareMany(
  pairs: FilePair[],
  opts: Readonly<ComparisonOptions>,
): Promise<ExitResult> {
  let exitWithError = false;

  // For --only filtering
  const run = createCategoryFilter(opts);

  // Overall totals (for --show-stats summary)
  const totals: Record<Category, number> = {
    missing: 0,
    extra: 0,
    empty: 0,
    duplicate: 0,
    gitignore: 0,
  };

  for (const pair of pairs) {
    if (processPair(pair, opts, run, totals)) {
      exitWithError = true;
    }
  }

  return { exitWithError };
}

interface PairComputation {
  /** Basename of the example file for display and JSON output */
  exampleName: string;
  /** Filtered comparison results for the active pair */
  filtered: Filtered;
  /** Duplicate keys found in the env file */
  dupsEnv: ReturnType<typeof findDuplicateKeys>;
  /** Duplicate keys found in the example file */
  dupsEx: ReturnType<typeof findDuplicateKeys>;
  /** Parsed key list from env file */
  currentKeys: string[];
  /** Parsed key list from example file */
  exampleKeys: string[];
  /** Gitignore issue for the env file, if any */
  gitignoreIssue: Filtered['gitignoreIssue'];
}

/**
 * Processes a single env/example pair end-to-end.
 * Handles validation, comparison, output, totals update and strict-mode exit logic.
 * @param pair The env/example pair to process.
 * @param opts The comparison options.
 * @param run Category filter function.
 * @param totals Running totals used for final summary.
 * @returns True if this pair should cause exit with error.
 */
function processPair(
  pair: FilePair,
  opts: Readonly<ComparisonOptions>,
  run: (category: Category) => boolean,
  totals: Record<Category, number>,
): boolean {
  const { envName, envPath, examplePath } = pair;

  if (!validatePairFiles(envPath, examplePath)) {
    return true;
  }

  const computation = computePairComparison(pair, opts, run);
  const { exampleName, filtered, dupsEnv, dupsEx, currentKeys, exampleKeys } =
    computation;

  printHeader(envName, exampleName, opts.json ?? false);

  const stats = calculateStats(
    currentKeys,
    exampleKeys,
    dupsEnv,
    dupsEx,
    filtered,
    opts.checkValues,
  );

  maybePrintStats(envName, exampleName, stats, filtered, opts);

  const allOk = isAllOk(filtered);

  printDuplicates(
    envName,
    exampleName,
    dupsEnv,
    dupsEx,
    opts.json ?? false,
    opts.fix ?? false,
  );

  const entry = compareJsonOutput({
    envName,
    exampleName,
    dupsEnv,
    dupsEx,
    gitignoreIssue: computation.gitignoreIssue,
    ok: allOk,
    filtered,
    stats,
  });

  const shouldExitFromTotals = updateTotals(filtered, totals, entry);

  printPairOutputs(envName, envPath, filtered, dupsEnv, opts);

  opts.collect?.(entry);

  const shouldExitFromStrict = Boolean(opts.strict && !allOk);
  return shouldExitFromTotals || shouldExitFromStrict;
}

/**
 * Validates that both input files exist before comparison.
 * Prints a not-found error when either file is missing.
 * @param envPath Path to the env file.
 * @param examplePath Path to the example file.
 * @returns True when both files exist, otherwise false.
 */
function validatePairFiles(envPath: string, examplePath: string): boolean {
  const envExists = fs.existsSync(envPath);
  const exampleExists = fs.existsSync(examplePath);

  if (!envExists || !exampleExists) {
    printErrorNotFound(envExists, exampleExists, envPath, examplePath);
    return false;
  }

  return true;
}

/**
 * Computes all comparison data for a single file pair.
 * Includes parsed keys, diffs, empty keys, duplicates and optional gitignore status.
 * @param pair The env/example pair to compare.
 * @param opts The comparison options.
 * @param run Category filter function.
 * @returns Structured comparison data used by output and summary steps.
 */
function computePairComparison(
  pair: FilePair,
  opts: Readonly<ComparisonOptions>,
  run: (category: Category) => boolean,
): PairComputation {
  const { envName, envPath, examplePath } = pair;
  const exampleName = path.basename(examplePath);

  const { current, example, currentKeys, exampleKeys } = parseAndFilterEnv(
    envPath,
    examplePath,
    opts,
  );

  const diff = diffEnv(current, example, opts.checkValues);
  const emptyKeys = Object.entries(current)
    .filter(([, v]) => (v ?? '').trim() === '')
    .map(([k]) => k);

  const { dupsEnv, dupsEx } = findDuplicates(envPath, examplePath, opts, run);

  const gitignoreIssue = run('gitignore')
    ? checkGitignoreStatus({ cwd: opts.cwd, envFile: envName })
    : null;

  const filtered: Filtered = {
    missing: run('missing') ? diff.missing : [],
    extra: run('extra') ? diff.extra : [],
    empty: run('empty') ? emptyKeys : [],
    mismatches: opts.checkValues ? diff.valueMismatches : [],
    duplicatesEnv: run('duplicate') ? dupsEnv : [],
    duplicatesEx: run('duplicate') ? dupsEx : [],
    gitignoreIssue,
  };

  return {
    exampleName,
    filtered,
    dupsEnv,
    dupsEx,
    currentKeys,
    exampleKeys,
    gitignoreIssue,
  };
}

/**
 * Prints stats for a pair when stats output is enabled and JSON output is disabled.
 * @param envName Name of the env file.
 * @param exampleName Name of the example file.
 * @param stats Computed stats for this comparison.
 * @param filtered Filtered result payload for issue counts.
 * @param opts Comparison options controlling output behavior.
 * @returns void
 */
function maybePrintStats(
  envName: string,
  exampleName: string,
  stats: ReturnType<typeof calculateStats>,
  filtered: Filtered,
  opts: Readonly<ComparisonOptions>,
): void {
  if (!opts.showStats || opts.json) return;

  printStats(
    envName,
    exampleName,
    stats,
    filtered,
    opts.json ?? false,
    opts.showStats ?? true,
    opts.checkValues ?? false,
  );
}

/**
 * Prints issue/fix related outputs for a pair and optionally runs auto-fix.
 * @param envName Name of the env file.
 * @param envPath Path to the env file.
 * @param filtered Filtered comparison results for this pair.
 * @param dupsEnv Duplicate key entries found in env file.
 * @param opts Comparison options controlling output and fix behavior.
 * @returns void
 */
function printPairOutputs(
  envName: string,
  envPath: string,
  filtered: Filtered,
  dupsEnv: ReturnType<typeof findDuplicateKeys>,
  opts: Readonly<ComparisonOptions>,
): void {
  printIssues(filtered, opts.json ?? false, opts.fix ?? false);

  if (filtered.gitignoreIssue && !opts.json && !opts.fix) {
    printGitignoreWarning({
      envFile: envName,
      reason: filtered.gitignoreIssue.reason,
    });
  }

  const hasGitignoreIssue = filtered.gitignoreIssue !== null;

  printFixTips(
    filtered,
    hasGitignoreIssue,
    opts.json ?? false,
    opts.fix ?? false,
  );

  if (!opts.fix) return;

  const { changed, result } = applyFixes({
    envPath,
    missingKeys: filtered.missing,
    duplicateKeys: dupsEnv.map((d) => d.key),
    ensureGitignore: hasGitignoreIssue,
  });

  const fixContext = {
    ...result,
    fixApplied: changed,
  };

  printAutoFix(fixContext, envName, opts.json ?? false);
}

/**
 * Creates a category filter function based on options.
 * fx: onlyFiltering({ only: ['missing', 'extra'] })
 * @param opts Comparison options
 * @returns A function that filters categories
 */
function createCategoryFilter(
  opts: ComparisonOptions,
): (category: Category) => boolean {
  const onlySet: Set<Category> | undefined = opts.only?.length
    ? new Set(opts.only)
    : undefined;

  return (category: Category) => !onlySet || onlySet.has(category);
}

/**
 * Finds duplicate keys in the environment and example files.
 * @param envPath The path to the .env file
 * @param examplePath The path to the .env.example file
 * @param opts Comparison options
 * @param run A function that determines if a category should be included
 * @returns An object containing arrays of duplicate keys for both files
 */
function findDuplicates(
  envPath: string,
  examplePath: string,
  opts: ComparisonOptions,
  run: (cat: Category) => boolean,
): DuplicateResult {
  if (opts.allowDuplicates || !run('duplicate'))
    return { dupsEnv: [], dupsEx: [] };

  const ignoreSet = new Set(opts.ignore);
  const regexList = opts.ignoreRegex;

  const filterKey = (key: string) =>
    !ignoreSet.has(key) && !regexList.some((rx) => rx.test(key));

  const dupsEnv = findDuplicateKeys(envPath).filter(({ key }) =>
    filterKey(key),
  );
  const dupsEx = findDuplicateKeys(examplePath).filter(({ key }) =>
    filterKey(key),
  );

  return { dupsEnv, dupsEx } satisfies DuplicateResult;
}

/**
 * Checks if all filtered comparison results are okay (i.e., no issues found).
 * This is used in compare.ts to determine if the comparison passed all checks.
 * @param filtered - The filtered comparison results.
 * @returns True if all checks pass, false otherwise.
 */
function isAllOk(filtered: Filtered): boolean {
  return (
    filtered.missing.length === 0 &&
    (filtered.extra?.length ?? 0) === 0 &&
    (filtered.empty?.length ?? 0) === 0 &&
    filtered.duplicatesEnv.length === 0 &&
    filtered.duplicatesEx.length === 0 &&
    (filtered.mismatches?.length ?? 0) === 0 &&
    !filtered.gitignoreIssue
  );
}
