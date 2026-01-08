import fs from 'fs';
import path from 'path';
import { parseEnvFile } from '../core/parseEnv.js';
import { diffEnv } from '../core/diffEnv.js';
import { checkGitignoreStatus } from '../services/git.js';
import { findDuplicateKeys } from '../services/duplicates.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';
import type {
  Category,
  CompareJsonEntry,
  ComparisonOptions,
  FilePair,
  ExitResult,
  Filtered,
  DuplicateResult,
} from '../config/types.js';
import { isAllOk } from '../core/helpers/isAllOk.js';
import { updateTotals } from '../core/helpers/updateTotals.js';
import { applyFixes } from '../core/fixEnv.js';
import { printFixTips } from '../ui/shared/printFixTips.js';
import { printStats } from '../ui/compare/printStats.js';
import { printDuplicates } from '../ui/shared/printDuplicates.js';
import { printHeader } from '../ui/compare/printHeader.js';
import { printAutoFix } from '../ui/shared/printAutoFix.js';
import { printIssues } from '../ui/compare/printIssues.js';
import { printSuccess } from '../ui/shared/printSuccess.js';
import { printGitignoreWarning } from '../ui/shared/printGitignore.js';

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
    mismatch: 0,
    duplicate: 0,
    gitignore: 0,
  };

  for (const { envName, envPath, examplePath } of pairs) {
    const exampleName = path.basename(examplePath);
    const entry: CompareJsonEntry = { env: envName, example: exampleName };

    const skipping = !fs.existsSync(envPath) || !fs.existsSync(examplePath);

    printHeader(envName, exampleName, opts.json ?? false, skipping);

    if (skipping) {
      exitWithError = true;
      entry.skipped = { reason: 'missing file' };
      opts.collect?.(entry);
      continue;
    }

    // Parse and filter env files
    const { current, example, currentKeys, exampleKeys } = parseAndFilter(
      envPath,
      examplePath,
      opts,
    );

    // Run checks
    const diff = diffEnv(current, example, opts.checkValues);

    const emptyKeys = Object.entries(current)
      .filter(([, v]) => (v ?? '').trim() === '')
      .map(([k]) => k);

    // Find duplicates
    const { dupsEnv, dupsEx } = findDuplicates(envPath, examplePath, opts, run);

    const gitignoreIssue = run('gitignore')
      ? checkGitignoreStatus({ cwd: opts.cwd, envFile: envName })
      : null;

    // Collect filtered results
    const filtered: Filtered = {
      missing: run('missing') ? diff.missing : [],
      extra: run('extra') ? diff.extra : [],
      empty: run('empty') ? emptyKeys : [],
      mismatches:
        run('mismatch') && opts.checkValues ? diff.valueMismatches : [],
      duplicatesEnv: run('duplicate') ? dupsEnv : [],
      duplicatesEx: run('duplicate') ? dupsEx : [],
      gitignoreIssue,
    };

    // Print stats if requested
    if (opts.showStats && !opts.json) {
      const envCount = currentKeys.length;
      const exampleCount = exampleKeys.length;
      const sharedCount = new Set(
        currentKeys.filter((k) => exampleKeys.includes(k)),
      ).size;

      const duplicateCount = [...dupsEnv, ...dupsEx].reduce(
        (acc, { count }) => acc + Math.max(0, count - 1),
        0,
      );

      const valueMismatchCount = opts.checkValues
        ? (filtered.mismatches?.length ?? 0)
        : 0;

      printStats(
        envName,
        exampleName,
        {
          envCount,
          exampleCount,
          sharedCount,
          duplicateCount,
          valueMismatchCount,
        },
        filtered,
        opts.json ?? false,
        opts.showStats ?? true,
        opts.checkValues ?? false,
      );
    }

    // Check if all is OK
    const allOk = isAllOk(filtered);

    if (allOk) {
      entry.ok = true;
      printSuccess(opts.json ?? false, 'compare');
      opts.collect?.(entry);
      continue;
    }

    // Print duplicates
    printDuplicates(envName, exampleName, dupsEnv, dupsEx, opts.json ?? false);

    // Track errors and update totals
    const shouldExit = updateTotals(filtered, totals, entry);
    if (shouldExit) {
      exitWithError = true;
    }

    // Print all issues
    printIssues(filtered, opts.json ?? false);

    if (filtered.gitignoreIssue && !opts.json) {
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
        examplePath,
        missingKeys: filtered.missing,
        duplicateKeys: dupsEnv.map((d) => d.key),
        ensureGitignore: hasGitignoreIssue,
      });

      printAutoFix(
        changed,
        result,
        envName,
        exampleName,
        opts.json ?? false,
        hasGitignoreIssue,
      );
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

interface ParsedAndFilteredEnv {
  current: Record<string, string>;
  example: Record<string, string>;
  currentKeys: string[];
  exampleKeys: string[];
}

/**
 * Parses and filters the environment and example files.
 * @param envPath The path to the .env file
 * @param examplePath The path to the .env.example file
 * @param opts Comparison options
 * @returns An object containing the parsed and filtered environment variables
 */
function parseAndFilter(
  envPath: string,
  examplePath: string,
  opts: ComparisonOptions,
): ParsedAndFilteredEnv {
  const currentFull = parseEnvFile(envPath);
  const exampleFull = parseEnvFile(examplePath);

  const currentKeys = filterIgnoredKeys(
    Object.keys(currentFull),
    opts.ignore,
    opts.ignoreRegex,
  );
  const exampleKeys = filterIgnoredKeys(
    Object.keys(exampleFull),
    opts.ignore,
    opts.ignoreRegex,
  );

  return {
    current: Object.fromEntries(
      currentKeys.map((k) => [k, currentFull[k] ?? '']),
    ),
    example: Object.fromEntries(
      exampleKeys.map((k) => [k, exampleFull[k] ?? '']),
    ),
    currentKeys,
    exampleKeys,
  };
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
