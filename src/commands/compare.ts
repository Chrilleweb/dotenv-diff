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
  ComparisonResult,
} from '../config/types.js';
import { isAllOk } from '../core/helpers/isAllOk.js';
import { applyFixes } from '../core/fixEnv.js';
import { printFixTips } from '../ui/compare/printFixTips.js';
import { printStats } from '../ui/compare/printStats.js';
import { printDuplicates } from '../ui/compare/printDuplicates.js';
import { printHeader } from '../ui/compare/printHeader.js';
import { printAutoFix } from '../ui/compare/printAutoFix.js';
import { printIssues } from '../ui/compare/printIssues.js';
import { printSuccess } from '../ui/compare/printSuccess.js';
import { printGitignoreWarning } from '../ui/shared/printGitignore.js';

/**
 * Compares multiple pairs of .env and .env.example files.
 * @param pairs - The pairs of environment files to compare.
 * @param opts - The comparison options.
 * @returns An object indicating the overall comparison results.
 */
export async function compareMany(
  pairs: FilePair[],
  opts: ComparisonOptions,
): Promise<ComparisonResult> {
  let exitWithError = false;

  // For --only filtering
  const onlySet: Set<Category> | undefined = opts.only?.length
    ? new Set(opts.only)
    : undefined;
  const run = (cat: Category) => !onlySet || onlySet.has(cat);

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

    const current = Object.fromEntries(
      currentKeys.map((k) => [k, currentFull[k] ?? '']),
    );
    const example = Object.fromEntries(
      exampleKeys.map((k) => [k, exampleFull[k] ?? '']),
    );

    // Run checks
    const diff = diffEnv(current, example, opts.checkValues);

    const emptyKeys = Object.entries(current)
      .filter(([, v]) => (v ?? '').trim() === '')
      .map(([k]) => k);

    let dupsEnv: Array<{ key: string; count: number }> = [];
    let dupsEx: Array<{ key: string; count: number }> = [];
    if (!opts.allowDuplicates && run('duplicate')) {
      dupsEnv = findDuplicateKeys(envPath).filter(
        ({ key }) =>
          !opts.ignore.includes(key) &&
          !opts.ignoreRegex.some((rx) => rx.test(key)),
      );
      dupsEx = findDuplicateKeys(examplePath).filter(
        ({ key }) =>
          !opts.ignore.includes(key) &&
          !opts.ignoreRegex.some((rx) => rx.test(key)),
      );
    }

    const gitignoreIssue = run('gitignore')
      ? checkGitignoreStatus({ cwd: opts.cwd, envFile: envName })
      : null;

    // Collect filtered results
    const filtered = {
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
        ? filtered.mismatches.length
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
      );
    }

    // Check if all is OK
    const allOk = isAllOk(filtered);

    if (allOk) {
      entry.ok = true;
      printSuccess(opts.json ?? false);
      opts.collect?.(entry);
      continue;
    }

    // Print duplicates
    printDuplicates(envName, exampleName, dupsEnv, dupsEx, opts.json ?? false);

    // Track errors and update totals
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

    // Print all issues
    printIssues(filtered, opts.json ?? false);

    if (filtered.gitignoreIssue && !opts.json) {
      printGitignoreWarning({
        envFile: envName,
        reason: filtered.gitignoreIssue.reason,
      });
    }

    const envNotIgnored = filtered.gitignoreIssue !== null;

    printFixTips(
      filtered,
      envNotIgnored,
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
        ensureGitignore: envNotIgnored,
      });

      printAutoFix(changed, result, envName, exampleName, opts.json ?? false);
    }

    opts.collect?.(entry);

    // In strict mode, any issue (not just errors) causes exit with error
    if (opts.strict && !allOk) {
      exitWithError = true;
    }
  }

  return { exitWithError };
}
