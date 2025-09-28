import type { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import { normalizeOptions } from '../config/options.js';
import { discoverEnvFiles } from '../services/envDiscovery.js';
import { pairWithExample } from '../services/envPairing.js';
import { ensureFilesOrPrompt } from '../services/ensureFilesOrPrompt.js';
import { compareMany } from '../commands/compare.js';
import { type CompareJsonEntry, type Options } from '../config/types.js';
import { scanUsage } from '../commands/scanUsage.js';

/**
 * Run the CLI program
 * @param program The commander program instance
 */
export async function run(program: Command) {
  program.parse(process.argv);
  const opts = normalizeOptions(program.opts());

  setupGlobalConfig(opts);

  // Route to appropriate command
  if (opts.compare) {
    await runCompareMode(opts);
  } else {
    await runScanMode(opts);
  }
}

/**
 * Setup global configuration
 */
function setupGlobalConfig(opts: Options) {
  if (opts.noColor) {
    chalk.level = 0; // disable colors globally
  }
}

/**
 * Run scan-usage mode (default behavior)
 */
async function runScanMode(opts: Options) {
  const envPath = opts.envFlag || (fs.existsSync('.env') ? '.env' : undefined);

  const { exitWithError } = await scanUsage({
    cwd: opts.cwd,
    include: opts.includeFiles,
    exclude: opts.excludeFiles,
    ignore: opts.ignore,
    ignoreRegex: opts.ignoreRegex,
    examplePath: opts.exampleFlag,
    envPath,
    fix: opts.fix,
    json: opts.json,
    showUnused: opts.showUnused,
    showStats: opts.showStats,
    isCiMode: opts.isCiMode,
    secrets: opts.secrets,
    strict: opts.strict ?? false,
    ...(opts.files ? { files: opts.files } : {}),
  });

  process.exit(exitWithError ? 1 : 0);
}

/**
 * Run compare mode
 */
async function runCompareMode(opts: Options) {
  // Handle direct file comparison (both --env and --example specified)
  if (opts.envFlag && opts.exampleFlag) {
    await runDirectFileComparison(opts);
    return;
  }

  // Handle auto-discovery comparison
  await runAutoDiscoveryComparison(opts);
}

/**
 * Compare two specific files directly
 */
async function runDirectFileComparison(opts: Options) {
  const envExists = fs.existsSync(opts.envFlag!);
  const exExists = fs.existsSync(opts.exampleFlag!);

  // Handle missing files
  if (!envExists || !exExists) {
    const shouldExit = await handleMissingFiles(
      opts,
      opts.envFlag!,
      opts.exampleFlag!,
    );
    if (shouldExit) return;
  }

  // Perform comparison
  const report: CompareJsonEntry[] = [];
  const { exitWithError } = await compareMany(
    [
      {
        envName: path.basename(opts.envFlag!),
        envPath: opts.envFlag!,
        examplePath: opts.exampleFlag!,
      },
    ],
    buildCompareOptions(opts, report),
  );

  outputResults(report, opts, exitWithError);
}

/**
 * Compare using auto-discovery
 */
async function runAutoDiscoveryComparison(opts: Options) {
  // Discover available env files
  const discovery = discoverEnvFiles({
    cwd: opts.cwd,
    envFlag: opts.envFlag ?? null,
    exampleFlag: opts.exampleFlag ?? null,
  });

  // Ensure required files exist or prompt to create them
  const initResult = await ensureFilesOrPrompt({
    cwd: discovery.cwd,
    primaryEnv: discovery.primaryEnv,
    primaryExample: discovery.primaryExample,
    alreadyWarnedMissingEnv: discovery.alreadyWarnedMissingEnv,
    isYesMode: opts.isYesMode,
    isCiMode: opts.isCiMode,
  });

  if (initResult.shouldExit) {
    outputResults([], opts, initResult.exitCode !== 0);
    return;
  }

  // Compare all discovered pairs
  const pairs = pairWithExample(discovery);
  const report: CompareJsonEntry[] = [];
  const { exitWithError } = await compareMany(
    pairs,
    buildCompareOptions(opts, report),
  );

  outputResults(report, opts, exitWithError);
}

/**
 * Handle missing files in CI vs interactive mode
 */
async function handleMissingFiles(
  opts: Options,
  envFlag: string,
  exampleFlag: string,
): Promise<boolean> {
  const envExists = fs.existsSync(envFlag);
  const exExists = fs.existsSync(exampleFlag);

  if (opts.isCiMode) {
    // In CI mode, just show errors and exit
    if (!envExists) {
      console.error(
        chalk.red(`❌ Error: --env file not found: ${path.basename(envFlag)}`),
      );
    }
    if (!exExists) {
      console.error(
        chalk.red(
          `❌ Error: --example file not found: ${path.basename(exampleFlag)}`,
        ),
      );
    }
    process.exit(1);
  } else {
    // Interactive mode - try to prompt for file creation
    const result = await ensureFilesOrPrompt({
      cwd: opts.cwd,
      primaryEnv: envFlag,
      primaryExample: exampleFlag,
      alreadyWarnedMissingEnv: false,
      isYesMode: opts.isYesMode,
      isCiMode: opts.isCiMode,
    });

    if (result.shouldExit) {
      outputResults([], opts, result.exitCode !== 0);
      return true;
    }
  }

  return false;
}

/**
 * Build options object for compareMany function
 */
function buildCompareOptions(opts: Options, report: CompareJsonEntry[]) {
  return {
    checkValues: opts.checkValues,
    cwd: opts.cwd,
    allowDuplicates: opts.allowDuplicates,
    fix: opts.fix,
    json: opts.json,
    ignore: opts.ignore,
    ignoreRegex: opts.ignoreRegex,
    showStats: opts.showStats,
    collect: (e: CompareJsonEntry) => report.push(e),
    ...(opts.only ? { only: opts.only } : {}),
  };
}

/**
 * Output results and exit with appropriate code
 */
function outputResults(
  report: CompareJsonEntry[],
  opts: Options,
  exitWithError: boolean,
) {
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exit(exitWithError ? 1 : 0);
}
