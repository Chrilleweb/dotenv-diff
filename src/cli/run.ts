import type { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { normalizeOptions } from '../config/options.js';
import { discoverEnvFiles } from '../core/envDiscovery.js';
import { pairWithExample } from '../core/envPairing.js';
import { ensureFilesOrPrompt } from '../commands/ensureFilesOrPrompt.js';
import { compareMany } from '../commands/compare.js';
import type {
  CompareJsonEntry,
  ComparisonOptions,
  Options,
  RawOptions,
  ExitResult,
} from '../config/types.js';
import { scanUsage } from '../commands/scanUsage.js';
import { printErrorNotFound } from '../ui/compare/printErrorNotFound.js';
import { setupGlobalConfig } from '../ui/shared/setupGlobalConfig.js';
import { loadConfig } from '../config/loadConfig.js';
import { DEFAULT_ENV_FILE } from '../config/constants.js';

/**
 * handleMissingFiles result
 */
interface ExitDecision extends ExitResult {
  shouldExit: boolean;
}

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

  // Route to appropriate command and handle exit
  const exitWithError = opts.compare
    ? await runCompareMode(opts)
    : await runScanMode(opts);

  process.exit(exitWithError ? 1 : 0);
}

/**
 * Run scan-usage mode (default behavior)
 * @param opts - Normalized options
 * @returns Whether to exit with an error code
 */
async function runScanMode(opts: Options): Promise<boolean> {
  const envPath = resolveEnvPath(opts.envFlag);

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
    strict: opts.strict,
    ignoreUrls: opts.ignoreUrls,
    files: opts.files,
    uppercaseKeys: opts.uppercaseKeys,
    expireWarnings: opts.expireWarnings,
    inconsistentNamingWarnings: opts.inconsistentNamingWarnings,
  });

  return exitWithError;
}

/**
 * Run compare mode
 * @param opts - Normalized options
 * @returns Whether to exit with an error code
 */
async function runCompareMode(opts: Options): Promise<boolean> {
  // Handle direct file comparison (both --env and --example specified)
  if (opts.envFlag && opts.exampleFlag) {
    return await runDirectFileComparison(opts);
  }

  // Handle auto-discovery comparison
  return await runAutoDiscoveryComparison(opts);
}

/**
 * Compare two specific files directly
 * @param opts - Normalized options
 * @returns Whether to exit with an error code
 */
async function runDirectFileComparison(opts: Options): Promise<boolean> {
  // Type guard ensures both flags are defined
  if (!opts.envFlag || !opts.exampleFlag) {
    throw new Error(
      'Both envFlag and exampleFlag must be defined for direct file comparison',
    );
  }

  const envExists = fs.existsSync(opts.envFlag);
  const exExists = fs.existsSync(opts.exampleFlag);

  // Handle missing files
  if (!envExists || !exExists) {
    const result = await handleMissingFiles(
      opts,
      opts.envFlag,
      opts.exampleFlag,
    );
    if (result.shouldExit) {
      outputResults([], opts);
      return result.exitWithError;
    }
  }

  // Perform comparison
  const report: CompareJsonEntry[] = [];
  const { exitWithError } = await compareMany(
    [
      {
        envName: path.basename(opts.envFlag),
        envPath: opts.envFlag,
        examplePath: opts.exampleFlag,
      },
    ],
    buildCompareOptions(opts, report),
  );

  outputResults(report, opts);
  return exitWithError;
}

/**
 * Compare using auto-discovery
 * @param opts - Normalized options
 * @returns Whether to exit with an error code
 */
async function runAutoDiscoveryComparison(opts: Options): Promise<boolean> {
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
    outputResults([], opts);
    return initResult.exitCode !== 0;
  }

  // Compare all discovered pairs
  const pairs = pairWithExample(discovery);
  const report: CompareJsonEntry[] = [];
  const { exitWithError } = await compareMany(
    pairs,
    buildCompareOptions(opts, report),
  );

  outputResults(report, opts);
  return exitWithError;
}

/**
 * Handle missing files in CI vs interactive mode
 * @param opts - Normalized options
 * @param envFlag - Path to the .env file
 * @param exampleFlag - Path to the example file
 * @returns Result indicating if process should exit and with what error code
 */
async function handleMissingFiles(
  opts: Options,
  envFlag: string,
  exampleFlag: string,
): Promise<ExitDecision> {
  const envExists = fs.existsSync(envFlag);
  const exExists = fs.existsSync(exampleFlag);

  if (opts.isCiMode) {
    // In CI mode, just show errors and exit
    printErrorNotFound(envExists, exExists, envFlag, exampleFlag);
    return { shouldExit: true, exitWithError: true };
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
      return { shouldExit: true, exitWithError: result.exitCode !== 0 };
    }
  }

  return { shouldExit: false, exitWithError: false };
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
 * Resolve the environment file path based on the flag or default
 * @param envFlag - Optional environment file path from CLI flag
 * @returns The resolved env file path or undefined
 */
function resolveEnvPath(
  envFlag: string | boolean | undefined,
): string | undefined {
  if (typeof envFlag === 'string') {
    return envFlag;
  }

  if (fs.existsSync(DEFAULT_ENV_FILE)) {
    return DEFAULT_ENV_FILE;
  }

  return undefined;
}

/**
 * Output results to console if in JSON mode
 * @param report - The comparison report entries
 * @param opts - Normalized options
 */
function outputResults(report: CompareJsonEntry[], opts: Options): void {
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  }
}
