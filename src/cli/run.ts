import type { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import { normalizeOptions } from '../config/options.js';
import { discoverEnvFiles } from '../services/envDiscovery.js';
import { pairWithExample } from '../services/envPairing.js';
import { ensureFilesOrPrompt } from '../commands/init.js';
import { compareMany, type CompareJsonEntry } from '../commands/compare.js';

export async function run(program: Command) {
  program.parse(process.argv);
  const raw = program.opts();
  const opts = normalizeOptions(raw);

  // Special-case: both flags → direct comparison of exactly those two files
  if (opts.envFlag && opts.exampleFlag) {
    const envExists = fs.existsSync(opts.envFlag);
    const exExists = fs.existsSync(opts.exampleFlag);
    if (!envExists || !exExists) {
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
    // For JSON mode, emit an empty report to keep output machine-friendly (optional; safe).
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
    json: opts.json,
    ignore: opts.ignore,
    ignoreRegex: opts.ignoreRegex,
    collect: (e) => report.push(e),
  });

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(exitWithError ? 1 : 0);
}
