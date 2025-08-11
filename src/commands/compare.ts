import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { parseEnvFile } from '../lib/parseEnv.js';
import { diffEnv } from '../lib/diffEnv.js';
import { warnIfEnvNotIgnored } from '../services/git.js';
import { findDuplicateKeys } from '../services/duplicates.js';

export async function compareMany(
  pairs: Array<{ envName: string; envPath: string; examplePath: string }>,
  opts: { checkValues: boolean; cwd: string; allowDuplicates?: boolean },
) {
  let exitWithError = false;

  for (const { envName, envPath, examplePath } of pairs) {
    if (!fs.existsSync(envPath) || !fs.existsSync(examplePath)) {
      console.log(
        chalk.bold(
          `🔍 Comparing ${envName} ↔ ${path.basename(examplePath)}...`,
        ),
      );
      console.log(
        chalk.yellow('  ⚠️  Skipping: missing matching example file.'),
      );
      console.log();
      continue;
    }

    console.log(
      chalk.bold(`🔍 Comparing ${envName} ↔ ${path.basename(examplePath)}...`),
    );

    warnIfEnvNotIgnored({
      cwd: opts.cwd,
      envFile: envName,
      log: (msg) => console.log(msg.replace(/^/gm, '  ')),
    });

    if (!opts.allowDuplicates) {
      const dupsEnv = findDuplicateKeys(envPath);
      if (dupsEnv.length > 0) {
        console.log(
          chalk.yellow(
            `  ⚠️  Duplicate keys in ${envName} (last occurrence wins):`,
          ),
        );
        dupsEnv.forEach(({ key, count }) =>
          console.log(chalk.yellow(`      - ${key} (${count} occurrences)`)),
        );
      }

      const exName = path.basename(examplePath);
      const dupsEx = findDuplicateKeys(examplePath);
      if (dupsEx.length > 0) {
        console.log(
          chalk.yellow(
            `  ⚠️  Duplicate keys in ${exName} (last occurrence wins):`,
          ),
        );
        dupsEx.forEach(({ key, count }) =>
          console.log(chalk.yellow(`      - ${key} (${count} occurrences)`)),
        );
      }
    }

    const current = parseEnvFile(envPath);
    const example = parseEnvFile(examplePath);
    const diff = diffEnv(current, example, opts.checkValues);

    const emptyKeys = Object.entries(current)
      .filter(([, v]) => (v ?? '').trim() === '')
      .map(([k]) => k);

    if (
      diff.missing.length === 0 &&
      diff.extra.length === 0 &&
      emptyKeys.length === 0 &&
      diff.valueMismatches.length === 0
    ) {
      console.log(chalk.green('  ✅ All keys match.'));
      console.log();
      continue;
    }

    if (diff.missing.length > 0) {
      exitWithError = true;
      console.log(chalk.red('  ❌ Missing keys:'));
      diff.missing.forEach((key) => console.log(chalk.red(`      - ${key}`)));
    }
    if (diff.extra.length > 0) {
      console.log(chalk.yellow('  ⚠️  Extra keys (not in example):'));
      diff.extra.forEach((key) => console.log(chalk.yellow(`      - ${key}`)));
    }
    if (emptyKeys.length > 0) {
      console.log(chalk.yellow('  ⚠️  Empty values:'));
      emptyKeys.forEach((key) => console.log(chalk.yellow(`      - ${key}`)));
    }
    if (opts.checkValues && diff.valueMismatches.length > 0) {
      console.log(chalk.yellow('  ⚠️  Value mismatches:'));
      diff.valueMismatches.forEach(({ key, expected, actual }) => {
        console.log(
          chalk.yellow(
            `      - ${key}: expected '${expected}', but got '${actual}'`,
          ),
        );
      });
    }
    console.log();
  }

  return { exitWithError };
}
