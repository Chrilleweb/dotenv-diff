import fs from 'fs';
import path from 'path';
import { parseEnvFile } from '../core/parseEnv.js';
import { diffEnv } from '../core/diffEnv.js';
import { warnIfEnvNotIgnored, isEnvIgnoredByGit } from '../services/git.js';
import { findDuplicateKeys } from '../services/duplicates.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';
import type {
  Category,
  CompareJsonEntry,
  ComparisonOptions,
  FilePair,
  ComparisonResult,
} from '../config/types.js';
import { applyFixes } from '../core/fixEnv.js';
import { printFixTips } from '../ui/compare/printFixTips.js';
import { printStats } from '../ui/compare/printStats.js';
import { printDuplicates } from '../ui/compare/printDuplicates.js';
import { printHeader } from '../ui/compare/printHeader.js';
import { printAutoFix } from '../ui/compare/printAutoFix.js';
import { printIssues } from '../ui/compare/printIssues.js';
import { printSuccess } from '../ui/compare/printSuccess.js';

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

  const onlySet: Set<Category> | undefined = opts.only?.length
    ? new Set(opts.only)
    : undefined;
  const run = (cat: Category) => !onlySet || onlySet.has(cat);

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

    if (skipping) {
      printHeader(envName, exampleName, opts.json, skipping);
      exitWithError = true;
      entry.skipped = { reason: 'missing file' };
      opts.collect?.(entry);
      continue;
    } else {
      printHeader(envName, exampleName, opts.json, skipping);
    }

    // Git ignore hint (only when not JSON)
    let gitignoreUnsafe = false;
    let gitignoreMsg: string | null = null;

    if (run('gitignore')) {
      warnIfEnvNotIgnored({
        cwd: opts.cwd,
        envFile: envName,
        log: (msg) => {
          gitignoreUnsafe = true;
          gitignoreMsg = msg;
        },
      });
    }

    // Duplicate detection (skip entirely if --only excludes it)
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

    // Diff + empty
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

    const diff = diffEnv(current, example, opts.checkValues);

    const emptyKeys = Object.entries(current)
      .filter(([, v]) => (v ?? '').trim() === '')
      .map(([k]) => k);

    const filtered = {
      missing: run('missing') ? diff.missing : [],
      extra: run('extra') ? diff.extra : [],
      empty: run('empty') ? emptyKeys : [],
      mismatches:
        run('mismatch') && opts.checkValues ? diff.valueMismatches : [],
      duplicatesEnv: run('duplicate') ? dupsEnv : [],
      duplicatesEx: run('duplicate') ? dupsEx : [],
      gitignoreUnsafe: run('gitignore') ? gitignoreUnsafe : false,
    };

    // --- Stats block for compare mode when --show-stats is active ---
    if (opts.showStats && !opts.json) {
      const envCount = currentKeys.length;
      const exampleCount = exampleKeys.length;
      const sharedCount = new Set(
        currentKeys.filter((k) => exampleKeys.includes(k)),
      ).size;

      // Duplicate "occurrences beyond the first", summed across both files
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
        opts.showStats,
      );
    }

    const allOk =
      filtered.missing.length === 0 &&
      filtered.extra.length === 0 &&
      filtered.empty.length === 0 &&
      filtered.duplicatesEnv.length === 0 &&
      filtered.duplicatesEx.length === 0 &&
      filtered.mismatches.length === 0;

    if (allOk) {
      entry.ok = true;
      printSuccess(opts.json);
      opts.collect?.(entry);
      continue;
    }

    printDuplicates(envName, exampleName, dupsEnv, dupsEx, opts.json ?? false);

    if (filtered.missing.length) {
      entry.missing = filtered.missing;
      exitWithError = true;
      totals.missing += filtered.missing.length;
    }
    if (filtered.extra.length) {
      entry.extra = filtered.extra;
      exitWithError = true;
      totals.extra += filtered.extra.length;
    }
    if (filtered.empty.length) {
      entry.empty = filtered.empty;
      exitWithError = true;
      totals.empty += filtered.empty.length;
    }
    if (filtered.mismatches.length) {
      entry.valueMismatches = filtered.mismatches;
      totals.mismatch += filtered.mismatches.length;
      exitWithError = true;
    }
    if (filtered.duplicatesEnv.length || filtered.duplicatesEx.length) {
      totals.duplicate +=
        filtered.duplicatesEnv.length + filtered.duplicatesEx.length;
      exitWithError = true;
    }
    if (filtered.gitignoreUnsafe) {
      totals.gitignore += 1;
      exitWithError = true;
    }

    printIssues(filtered, opts.json);

    if (!opts.json && !opts.fix) {
      const ignored = isEnvIgnoredByGit({ cwd: opts.cwd, envFile: '.env' });
      const envNotIgnored = ignored === false || ignored === null;
      printFixTips(filtered, envNotIgnored, opts.json ?? false, opts.fix);
    }

    if (opts.fix) {
  const { changed, result } = applyFixes({
    envPath,
    examplePath,
    missingKeys: filtered.missing,
    duplicateKeys: dupsEnv.map((d) => d.key),
  });

  printAutoFix(changed, result, envName, exampleName, opts.json);
}

    opts.collect?.(entry);
    const warningsExist =
      filtered.extra.length > 0 ||
      filtered.empty.length > 0 ||
      filtered.duplicatesEnv.length > 0 ||
      filtered.duplicatesEx.length > 0 ||
      filtered.mismatches.length > 0 ||
      filtered.gitignoreUnsafe;

    if (opts.strict && warningsExist) {
      exitWithError = true;
    }
  }

  return { exitWithError };
}
