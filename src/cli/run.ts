import type { Command } from 'commander';
import { normalizeOptions } from '../config/options.js';
import { discoverEnvFiles } from '../services/envDiscovery.js';
import { pairWithExample } from '../services/envPairing.js';
import { ensureFilesOrPrompt } from '../commands/init.js';
import { compareMany } from '../commands/compare.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export async function run(program: Command) {
  program.parse(process.argv);
  const raw = program.opts();
  const opts = normalizeOptions(raw);

  // Special-case: both flags → direct comparison
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
      },
    );
    process.exit(exitWithError ? 1 : 0);
  }

  const d = discoverEnvFiles({
    cwd: opts.cwd,
    envFlag: opts.envFlag,
    exampleFlag: opts.exampleFlag,
  });

  const res = await ensureFilesOrPrompt({
    cwd: d.cwd,
    primaryEnv: d.primaryEnv,
    primaryExample: d.primaryExample,
    alreadyWarnedMissingEnv: d.alreadyWarnedMissingEnv,
    isYesMode: opts.isYesMode,
    isCiMode: opts.isCiMode,
  });
  if (res.shouldExit) process.exit(res.exitCode);

  // compare all pairs
  const pairs = pairWithExample(d);
  const { exitWithError } = await compareMany(pairs, {
    checkValues: opts.checkValues,
    cwd: opts.cwd,
    allowDuplicates: opts.allowDuplicates,
  });
  process.exit(exitWithError ? 1 : 0);
}
