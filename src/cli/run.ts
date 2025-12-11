import type { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { normalizeOptions } from '../config/options.js';
import { discoverEnvFiles } from '../services/envDiscovery.js';
import { pairWithExample } from '../services/envPairing.js';
import { ensureFilesOrPrompt } from '../services/ensureFilesOrPrompt.js';
import { compareMany } from '../commands/compare.js';
import {
  type CompareJsonEntry,
  type ComparisonOptions,
  type Options,
  type RawOptions,
} from '../config/types.js';
import { scanUsage } from '../commands/scanUsage.js';
import { printErrorNotFound } from '../ui/compare/printErrorNotFound.js';
import { setupGlobalConfig } from '../ui/shared/setupGlobalConfig.js';
import { loadConfig } from '../config/loadConfig.js';

/**
 * Run the CLI program
 * @param program The commander program instance
 * @returns void
 */
export async function run(program: Command): Promise<void> {
  program.parse(process.argv);

  // Load and normalize options
  const cliOptions = program.opts();

  // Handle --init flag
  if (await handleInitFlag(cliOptions)) return;

  // Merge CLI options with config file options
  const mergedRawOptions = loadConfig(cliOptions);

  // Normalize merged options
  const opts = normalizeOptions(mergedRawOptions);

  setupGlobalConfig(opts);

  // Route to appropriate command
  if (opts.compare) {
    await runCompareMode(opts);
  } else {
    await runScanMode(opts);
  }
}

/**
 * Run scan-usage mode (default behavior)
 * @param opts - Normalized options
 * @returns void
 */
async function runScanMode(opts: Options): Promise<void> {
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
    ignoreUrls: opts.ignoreUrls ?? [],
    uppercaseKeys: opts.uppercaseKeys ?? true,
    expireWarnings: opts.expireWarnings,
    inconsistentNamingWarnings: opts.inconsistentNamingWarnings,
    t3env: opts.t3env,
    ...(opts.files ? { files: opts.files } : {}),
  });

  process.exit(exitWithError ? 1 : 0);
}

/**
 * Run compare mode
 * @param opts - Normalized options
 * @returns void
 */
async function runCompareMode(opts: Options): Promise<void> {
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
 * @param opts - Normalized options
 * @returns void
 */
async function runDirectFileComparison(opts: Options): Promise<void> {
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
 * @param opts - Normalized options
 * @returns void
 */
async function runAutoDiscoveryComparison(opts: Options): Promise<void> {
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
 * @param opts - Normalized options
 * @param envFlag - Path to the .env file
 * @param exampleFlag - Path to the example file
 * @returns Whether the process should exit after handling missing files
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
    printErrorNotFound(envExists, exExists, envFlag, exampleFlag);
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
 * @param opts - Normalized options
 * @param report - Array to collect JSON report entries
 * @returns ComparisonOptions object
 */
function buildCompareOptions(
  opts: Options,
  report: CompareJsonEntry[],
): ComparisonOptions {
  return {
    checkValues: opts.checkValues,
    cwd: opts.cwd,
    allowDuplicates: opts.allowDuplicates,
    fix: opts.fix,
    json: opts.json,
    ignore: opts.ignore,
    ignoreRegex: opts.ignoreRegex,
    showStats: opts.showStats,
    uppercaseKeys: opts.uppercaseKeys,
    collect: (e: CompareJsonEntry) => report.push(e),
    ...(opts.only ? { only: opts.only } : {}),
  };
}

/**
 * Handle the --init flag to create a sample config file
 * @param cliOptions - The CLI options parsed by commander
 * @returns Whether the init process was handled
 */
async function handleInitFlag(cliOptions: RawOptions): Promise<boolean> {
  if (cliOptions.init) {
    const { runInit } = await import('../commands/init.js');
    await runInit();
    return true;
  }
  return false;
}

/**
 * Output results and exit with appropriate code
 * @param report - The comparison report entries
 * @param opts - Normalized options
 * @param exitWithError - Whether to exit with an error code
 */
function outputResults(
  report: CompareJsonEntry[],
  opts: Options,
  exitWithError: boolean,
): void {
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exit(exitWithError ? 1 : 0);
}
