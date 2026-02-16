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
import { printSuccess } from '../ui/shared/printSuccess.js';
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

  for (const { envName, envPath, examplePath } of pairs) {
    const exampleName = path.basename(examplePath);

    // Check if files exist
    const envExists = fs.existsSync(envPath);
    const exampleExists = fs.existsSync(examplePath);

    if (!envExists || !exampleExists) {
      printErrorNotFound(envExists, exampleExists, envPath, examplePath);
      exitWithError = true;
      continue;
    }

    printHeader(envName, exampleName, opts.json ?? false);

    // Parse and filter env files
    const { current, example, currentKeys, exampleKeys } = parseAndFilterEnv(
      envPath,
      examplePath,
      opts,
    );

    // Run checks
    const diff = diffEnv(current, example, opts.checkValues);

    // Find empty keys in current env
    const emptyKeys = Object.entries(current)
      .filter(([, v]) => (v ?? '').trim() === '')
      .map(([k]) => k);

    // Find duplicates
    const { dupsEnv, dupsEx } = findDuplicates(envPath, examplePath, opts, run);

    // Check gitignore status
    const gitignoreIssue = run('gitignore')
      ? checkGitignoreStatus({ cwd: opts.cwd, envFile: envName })
      : null;

    // Collect filtered results
    const filtered: Filtered = {
      missing: run('missing') ? diff.missing : [],
      extra: run('extra') ? diff.extra : [],
      empty: run('empty') ? emptyKeys : [],
      mismatches: opts.checkValues ? diff.valueMismatches : [],
      duplicatesEnv: run('duplicate') ? dupsEnv : [],
      duplicatesEx: run('duplicate') ? dupsEx : [],
      gitignoreIssue,
    };

    // Print stats if requested
    if (opts.showStats && !opts.json) {
      const stats = calculateStats(
        currentKeys,
        exampleKeys,
        dupsEnv,
        dupsEx,
        filtered,
        opts.checkValues,
      );

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

    // Check if all is OK
    const allOk = isAllOk(filtered);

    if (allOk) {
      printSuccess(opts.json ?? false, 'compare');
    }

    // Print duplicates
    printDuplicates(
      envName,
      exampleName,
      dupsEnv,
      dupsEx,
      opts.json ?? false,
      opts.fix ?? false,
    );

    // Calculate stats for JSON entry
    const stats = calculateStats(
      currentKeys,
      exampleKeys,
      dupsEnv,
      dupsEx,
      filtered,
      opts.checkValues,
    );

    // Build JSON entry with all the data
    const entry = compareJsonOutput({
      envName,
      exampleName,
      dupsEnv,
      dupsEx,
      gitignoreIssue,
      ok: allOk,
      filtered,
      stats,
    });

    // Track errors and update totals
    const shouldExit = updateTotals(filtered, totals, entry);
    if (shouldExit) {
      exitWithError = true;
    }

    // Print all issues
    printIssues(filtered, opts.json ?? false, opts.fix ?? false);

    if (filtered.gitignoreIssue && !opts.json && !opts.fix) {
      printGitignoreWarning({
        envFile: envName,
        reason: filtered.gitignoreIssue.reason,
      });
    }

    const hasGitignoreIssue: boolean = filtered.gitignoreIssue !== null;

    printFixTips(
      filtered,
      hasGitignoreIssue,
      opts.json ?? false,
      opts.fix ?? false,
    );

    // Apply auto-fix if requested
    if (opts.fix) {
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

    opts.collect?.(entry);

    // In strict mode, any issue (not just errors) causes exit with error
    if (opts.strict && !allOk) {
      exitWithError = true;
    }
  }

  return { exitWithError };
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
