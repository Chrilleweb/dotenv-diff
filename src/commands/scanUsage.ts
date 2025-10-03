import chalk from 'chalk';
import path from 'path';
import { scanCodebase } from '../services/codeBaseScanner.js';
import type {
  ScanUsageOptions,
  EnvUsage,
  Filtered,
  ScanResult,
} from '../config/types.js';
import { resolveFromCwd } from '../core/helpers/resolveFromCwd.js';
import { determineComparisonFile } from '../core/determineComparisonFile.js';
import { outputToConsole } from '../services/scanOutputToConsole.js';
import { createJsonOutput } from '../core/scanJsonOutput.js';
import { applyFixes } from '../core/fixEnv.js';
import { isEnvIgnoredByGit } from '../services/git.js';
import { printFixTips } from '../ui/shared/printFixTips.js';
import { printMissingExample } from '../ui/scan/printMissingExample.js';
import { processComparisonFile } from '../core/processComparisonFile.js';
import { printAutoFix } from '../ui/compare/printAutoFix.js';
import { printGitignoreWarning } from '../ui/shared/printGitignore.js';

/**
 * Filters out commented usages from the list.
 * Skipping comments:
 *   // process.env.API_URL
 *   # process.env.API_URL
 *   /* process.env.API_URL
 *   * process.env.API_URL
 * @param usages - List of environment variable usages
 * @returns Filtered list of environment variable usages
 */
function skipCommentedUsages(usages: EnvUsage[]): EnvUsage[] {
  return usages.filter(
    (u) => u.context && !/^\s*(\/\/|#|\/\*|\*)/.test(u.context.trim()),
  );
}

/**
 * Recalculates statistics for a scan result after filtering usages.
 * @param scanResult The current scan result
 * @returns Updated scanResult with recalculated stats
 */
function calculateStats(scanResult: ScanResult): ScanResult {
  const uniqueVariables = new Set(
    scanResult.used.map((u: EnvUsage) => u.variable),
  ).size;

  scanResult.stats = {
    filesScanned: scanResult.stats.filesScanned,
    totalUsages: scanResult.used.length,
    uniqueVariables,
  };

  return scanResult;
}

/**
 * Scans codebase for environment variable usage and compares with .env file
 * @param {ScanUsageOptions} opts - Scan configuration options
 * @param {string} [opts.envPath] - Path to .env file for comparison
 * @param {string} [opts.examplePath] - Path to .env.example file for comparison
 * @param {boolean} opts.json - Output as JSON instead of console
 * @param {boolean} opts.showUnused - Show unused variables from .env
 * @param {boolean} opts.showStats - Show detailed statistics
 * @param {boolean} [opts.isCiMode] - Run in CI mode (exit with error code)
 * @param {boolean} [opts.allowDuplicates] - Allow duplicate keys without warning
 * @returns {Promise<{exitWithError: boolean}>} Returns true if missing variables found
 */
export async function scanUsage(
  opts: ScanUsageOptions,
): Promise<{ exitWithError: boolean }> {
  // Scan the codebase
  let scanResult = await scanCodebase(opts);

  // Filter out commented usages
  scanResult.used = skipCommentedUsages(scanResult.used);

  // Recalculate stats after filtering
  calculateStats(scanResult);

  // If user explicitly passed --example flag, but the file doesn't exist:
  if (printMissingExample(opts)) {
    return { exitWithError: true };
  }

  // Determine which file to compare against
  const compareFile = determineComparisonFile(opts);
  let envVariables: Record<string, string | undefined> = {};
  let comparedAgainst = '';
  let duplicatesFound = false;
  let dupsEnv: Array<{ key: string; count: number }> = [];
  let dupsExample: Array<{ key: string; count: number }> = [];

  // Store fix information for consolidated display
  let fixApplied = false;
  let fixedKeys: string[] = [];
  let removedDuplicates: string[] = [];
  let gitignoreUpdated = false;

  if (compareFile) {
  const result = processComparisonFile(scanResult, compareFile, opts);

  if (result.error) {
    const errorMessage = `⚠️  ${result.error.message}`;
    if (result.error.shouldExit) {
      console.log(chalk.red(errorMessage.replace('⚠️', '❌')));
      return { exitWithError: true };
    }
    if (!opts.json) console.log(chalk.yellow(errorMessage));
  } else {
    scanResult = result.scanResult;
    envVariables = result.envVariables;
    comparedAgainst = result.comparedAgainst;
    duplicatesFound = result.duplicatesFound;
    dupsEnv = result.dupsEnv;
    dupsExample = result.dupsExample;
    fixApplied = result.fixApplied;
    removedDuplicates = result.removedDuplicates;
    fixedKeys = result.addedEnv;
    gitignoreUpdated = result.gitignoreUpdated;
  }
}


  // JSON output
  if (opts.json) {
    const jsonOutput = createJsonOutput(
      scanResult,
      opts,
      comparedAgainst,
      Object.keys(envVariables).length,
    );
    console.log(JSON.stringify(jsonOutput, null, 2));
    return {
      exitWithError:
        scanResult.missing.length > 0 ||
        duplicatesFound ||
        !!(
          opts.strict &&
          (scanResult.unused.length > 0 ||
            (scanResult.duplicates?.env?.length ?? 0) > 0 ||
            (scanResult.duplicates?.example?.length ?? 0) > 0 ||
            (scanResult.secrets?.length ?? 0) > 0)
        ),
    };
  }

  const filtered: Filtered = {
    missing: scanResult.missing ?? [],
    duplicatesEnv: dupsEnv,
    duplicatesEx: dupsExample,
    gitignoreIssue:
      isEnvIgnoredByGit({ cwd: opts.cwd, envFile: '.env' }) === false ||
      isEnvIgnoredByGit({ cwd: opts.cwd, envFile: '.env' }) === null
        ? { reason: 'not-ignored' }
        : null,
  };

  // Console output
  const result = outputToConsole(scanResult, opts, comparedAgainst);

  // Consolidated fix message
  if (opts.fix && !opts.json) {
    printAutoFix(
      fixApplied,
      {
        removedDuplicates,
        addedEnv: fixedKeys,
        addedExample: opts.examplePath ? fixedKeys : [],
      },
      comparedAgainst || '.env',
      opts.examplePath ? path.basename(opts.examplePath) : 'example file',
      opts.json ?? false,
      gitignoreUpdated,
    );
  }

  if (!opts.json && !opts.fix) {
    const ignored = isEnvIgnoredByGit({ cwd: opts.cwd, envFile: '.env' });
    const envNotIgnored = ignored === false || ignored === null;

    printFixTips(
      filtered,
      envNotIgnored,
      opts.json ?? false,
      opts.fix ?? false,
    );
  }

  return { exitWithError: result.exitWithError || duplicatesFound };
}
