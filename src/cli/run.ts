import type { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import { normalizeOptions } from '../config/options.js';
import { discoverEnvFiles } from '../services/envDiscovery.js';
import { pairWithExample } from '../services/envPairing.js';
import { ensureFilesOrPrompt } from '../commands/init.js';
import { compareMany } from '../commands/compare.js';
import type { CompareJsonEntry } from '../config/types.js';
import { scanUsage } from '../commands/scanUsage.js';

export async function run(program: Command) {
  program.parse(process.argv);
  const raw = program.opts();
  const opts = normalizeOptions(raw);

  if (opts.noColor) {
    chalk.level = 0; // disable colors globally
  }

  // DEFAULT: scan-usage unless --compare is set
  if (!opts.compare) {
    const envPath =
      opts.envFlag || (fs.existsSync('.env') ? '.env' : undefined);

    const { exitWithError } = await scanUsage({
      cwd: opts.cwd,
      include: opts.includeFiles,
      exclude: opts.excludeFiles,
      ignore: opts.ignore,
      ignoreRegex: opts.ignoreRegex,
      examplePath: opts.exampleFlag || undefined,
      envPath,
      fix: opts.fix,
      json: opts.json,
      showUnused: opts.showUnused,
      showStats: opts.showStats,
      isCiMode: opts.isCiMode,
      files: opts.files,
      secrets: opts.secrets,
    });

    process.exit(exitWithError ? 1 : 0);
  }

  // Special-case: both flags → direct comparison of exactly those two files
  if (opts.envFlag && opts.exampleFlag) {
    const envExists = fs.existsSync(opts.envFlag);
    const exExists = fs.existsSync(opts.exampleFlag);

    // Handle missing files with prompting (unless in CI mode)
    if (!envExists || !exExists) {
      // Check if we should prompt for file creation
      if (!opts.isCiMode) {
        const res = await ensureFilesOrPrompt({
          cwd: opts.cwd,
          primaryEnv: opts.envFlag,
          primaryExample: opts.exampleFlag,
          alreadyWarnedMissingEnv: false,
          isYesMode: opts.isYesMode,
          isCiMode: opts.isCiMode,
        });

        if (res.shouldExit) {
          if (opts.json) console.log(JSON.stringify([], null, 2));
          process.exit(res.exitCode);
        }
      } else {
        // In CI mode, we just show errors and exit
        if (!envExists) {
          console.error(
            chalk.red(
              `❌ Error: --env file not found: ${path.basename(opts.envFlag)}`,
            ),
          );
        }
        if (!exExists) {
          console.error(
            chalk.red(
              `❌ Error: --example file not found: ${path.basename(opts.exampleFlag)}`,
            ),
          );
        }
        process.exit(1);
      }
    }

    const report: CompareJsonEntry[] = [];
    const { exitWithError } = await compareMany(
      [
        {
          envName: path.basename(opts.envFlag),
          envPath: opts.envFlag,
          examplePath: opts.exampleFlag,
        },
      ],
      {
        checkValues: opts.checkValues,
        cwd: opts.cwd,
        allowDuplicates: opts.allowDuplicates,
        json: opts.json,
        ignore: opts.ignore,
        ignoreRegex: opts.ignoreRegex,
        only: opts.only,
        showStats: opts.showStats,
        collect: (e) => report.push(e),
      },
    );

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
    }
    process.exit(exitWithError ? 1 : 0);
  }

  // Auto-discovery flow
  const d = discoverEnvFiles({
    cwd: opts.cwd,
    envFlag: opts.envFlag,
    exampleFlag: opts.exampleFlag,
  });

  // Init cases (may create files or early-exit)
  const res = await ensureFilesOrPrompt({
    cwd: d.cwd,
    primaryEnv: d.primaryEnv,
    primaryExample: d.primaryExample,
    alreadyWarnedMissingEnv: d.alreadyWarnedMissingEnv,
    isYesMode: opts.isYesMode,
    isCiMode: opts.isCiMode,
  });
  if (res.shouldExit) {
    if (opts.json) console.log(JSON.stringify([], null, 2));
    process.exit(res.exitCode);
  }

  // Compare all discovered pairs
  const pairs = pairWithExample(d);
  const report: CompareJsonEntry[] = [];
  const { exitWithError } = await compareMany(pairs, {
    checkValues: opts.checkValues,
    cwd: opts.cwd,
    allowDuplicates: opts.allowDuplicates,
    fix: opts.fix,
    json: opts.json,
    ignore: opts.ignore,
    ignoreRegex: opts.ignoreRegex,
    only: opts.only,
    showStats: opts.showStats,
    collect: (e) => report.push(e),
  });

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(exitWithError ? 1 : 0);
}
