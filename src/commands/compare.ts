import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { parseEnvFile } from '../lib/parseEnv.js';
import { diffEnv } from '../lib/diffEnv.js';
import { warnIfEnvNotIgnored } from '../services/git.js';
import { findDuplicateKeys } from '../services/duplicates.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';
import type { Category, CompareJsonEntry } from '../config/types.js';

export async function compareMany(
  pairs: Array<{ envName: string; envPath: string; examplePath: string }>,
  opts: {
    checkValues: boolean;
    cwd: string;
    allowDuplicates?: boolean;
    json?: boolean;
    ignore: string[];
    ignoreRegex: RegExp[];
    collect?: (entry: CompareJsonEntry) => void;
    only?: Category[];
  },
) {
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

    if (!fs.existsSync(envPath) || !fs.existsSync(examplePath)) {
      if (!opts.json) {
        console.log(chalk.bold(`🔍 Comparing ${envName} ↔ ${exampleName}...`));
        console.log(
          chalk.yellow('  ⚠️  Skipping: missing matching example file.'),
        );
        console.log();
      }
      entry.skipped = { reason: 'missing file' };
      opts.collect?.(entry);
      continue;
    }

    if (!opts.json) {
      console.log(chalk.bold(`🔍 Comparing ${envName} ↔ ${exampleName}...`));
    }

    // Git ignore hint (only when not JSON)
    let gitignoreUnsafe = false;
    if (run('gitignore')) {
      warnIfEnvNotIgnored({
        cwd: opts.cwd,
        envFile: envName,
        log: (msg) => {
          gitignoreUnsafe = true;
          if (!opts.json) console.log(msg.replace(/^/gm, '  '));
        },
      });
    } else {
      // still call to keep previous hints? No—masked by --only.
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
      if (dupsEnv.length || dupsEx.length) {
        entry.duplicates = {};
      }
      if (dupsEnv.length) {
        entry.duplicates!.env = dupsEnv;
        if (!opts.json) {
          console.log(
            chalk.yellow(
              `  ⚠️  Duplicate keys in ${envName} (last occurrence wins):`,
            ),
          );
          dupsEnv.forEach(({ key, count }) =>
            console.log(chalk.yellow(`      - ${key} (${count} occurrences)`)),
          );
        }
      }
      if (dupsEx.length) {
        entry.duplicates!.example = dupsEx;
        if (!opts.json) {
          console.log(
            chalk.yellow(
              `  ⚠️  Duplicate keys in ${exampleName} (last occurrence wins):`,
            ),
          );
          dupsEx.forEach(({ key, count }) =>
            console.log(chalk.yellow(`      - ${key} (${count} occurrences)`)),
          );
        }
      }
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
      currentKeys.map((k) => [k, currentFull[k]]),
    );
    const example = Object.fromEntries(
      exampleKeys.map((k) => [k, exampleFull[k]]),
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

    const allOk =
      filtered.missing.length === 0 &&
      filtered.extra.length === 0 &&
      filtered.empty.length === 0 &&
      filtered.mismatches.length === 0;

    if (allOk) {
      entry.ok = true;
      if (!opts.json) {
        console.log(chalk.green('  ✅ All keys match.'));
        console.log();
      }
      opts.collect?.(entry);
      continue;
    }

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
      entry.valueMismatches = filtered.mismatches as any;
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

    if (!opts.json) {
      if (filtered.missing.length) {
        console.log(chalk.red('  ❌ Missing keys:'));
        filtered.missing.forEach((key) =>
          console.log(chalk.red(`      - ${key}`)),
        );
      }
      if (filtered.extra.length) {
        console.log(chalk.yellow('  ⚠️  Extra keys (not in example):'));
        filtered.extra.forEach((key) =>
          console.log(chalk.yellow(`      - ${key}`)),
        );
      }
      if (filtered.empty.length) {
        console.log(chalk.yellow('  ⚠️  Empty values:'));
        filtered.empty.forEach((key) =>
          console.log(chalk.yellow(`      - ${key}`)),
        );
      }
      if (filtered.mismatches.length) {
        console.log(chalk.yellow('  ⚠️  Value mismatches:'));
        filtered.mismatches.forEach(({ key, expected, actual }) =>
          console.log(
            chalk.yellow(
              `      - ${key}: expected '${expected}', but got '${actual}'`,
            ),
          ),
        );
      }
      console.log();
    }

    opts.collect?.(entry);
  }

  return { exitWithError };
}
