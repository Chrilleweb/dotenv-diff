import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { parseEnvFile } from '../lib/parseEnv.js';
import { diffEnv } from '../lib/diffEnv.js';
import { warnIfEnvNotIgnored } from '../services/git.js';
import { findDuplicateKeys } from '../services/duplicates.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';

export type CompareJsonEntry = {
  env: string;
  example: string;
  skipped?: { reason: string };
  duplicates?: {
    env?: Array<{ key: string; count: number }>;
    example?: Array<{ key: string; count: number }>;
  };
  missing?: string[];
  extra?: string[];
  empty?: string[];
  valueMismatches?: Array<{ key: string; expected: string; actual: string }>;
  ok?: boolean;
};

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
  },
) {
  let exitWithError = false;

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
    warnIfEnvNotIgnored({
      cwd: opts.cwd,
      envFile: envName,
      log: (msg) => {
        if (!opts.json) console.log(msg.replace(/^/gm, '  '));
      },
    });

    // Duplicate detection
    if (!opts.allowDuplicates) {
      const dupsEnv = findDuplicateKeys(envPath).filter(
        ({ key }) =>
          !opts.ignore.includes(key) &&
          !opts.ignoreRegex.some((rx) => rx.test(key)),
      );
      const dupsEx = findDuplicateKeys(examplePath).filter(
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

    const allOk =
      diff.missing.length === 0 &&
      diff.extra.length === 0 &&
      emptyKeys.length === 0 &&
      diff.valueMismatches.length === 0;

    if (allOk) {
      entry.ok = true;
      if (!opts.json) {
        console.log(chalk.green('  ✅ All keys match.'));
        console.log();
      }
      opts.collect?.(entry);
      continue;
    }

    if (diff.missing.length) {
      entry.missing = diff.missing;
      exitWithError = true;
    }
    if (diff.extra.length) entry.extra = diff.extra;
    if (emptyKeys.length) entry.empty = emptyKeys;
    if (opts.checkValues && diff.valueMismatches.length) {
      entry.valueMismatches = diff.valueMismatches;
    }

    if (!opts.json) {
      if (diff.missing.length) {
        console.log(chalk.red('  ❌ Missing keys:'));
        diff.missing.forEach((key) => console.log(chalk.red(`      - ${key}`)));
      }
      if (diff.extra.length) {
        console.log(chalk.yellow('  ⚠️  Extra keys (not in example):'));
        diff.extra.forEach((key) =>
          console.log(chalk.yellow(`      - ${key}`)),
        );
      }
      if (emptyKeys.length) {
        console.log(chalk.yellow('  ⚠️  Empty values:'));
        emptyKeys.forEach((key) => console.log(chalk.yellow(`      - ${key}`)));
      }
      if (opts.checkValues && diff.valueMismatches.length) {
        console.log(chalk.yellow('  ⚠️  Value mismatches:'));
        diff.valueMismatches.forEach(({ key, expected, actual }) =>
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
