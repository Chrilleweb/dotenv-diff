import { scanCodebase } from '../services/codeBaseScanner.js';
import type {
  ScanUsageOptions,
  EnvUsage,
  ScanResult,
} from '../config/types.js';
import { determineComparisonFile } from '../core/determineComparisonFile.js';
import { outputToConsole } from '../services/scanOutputToConsole.js';
import { createJsonOutput } from '../core/scanJsonOutput.js';
import { printMissingExample } from '../ui/scan/printMissingExample.js';
import { processComparisonFile } from '../core/processComparisonFile.js';
import { printComparisonError } from '../ui/scan/printComparisonError.js';
import { hasIgnoreComment } from '../core/secretDetectors.js';
import { frameworkValidator } from '../core/frameworkValidator.js';
import { detectSecretsInExample } from '../core/exampleSecretDetector.js';

/**
 * Filters out commented usages from the list.
 * Skipping comments:
 *   // process.env.API_URL
 *   # process.env.API_URL
 *   /* process.env.API_URL
 *   * process.env.API_URL
 *   <!-- process.env.API_URL -->
 * @param usages - List of environment variable usages
 * @returns Filtered list of environment variable usages
 */
function skipCommentedUsages(usages: EnvUsage[]): EnvUsage[] {
  let insideHtmlComment = false;
  let insideIgnoreBlock = false;

  return usages.filter((u) => {
    if (!u.context) return true;
    const line = u.context.trim();

    if (line.includes('<!--')) insideHtmlComment = true;
    if (line.includes('-->')) {
      insideHtmlComment = false;
      return false;
    }

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*start\s*-->/i.test(line)) {
      insideIgnoreBlock = true;
      return false;
    }

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*end\s*-->/i.test(line)) {
      insideIgnoreBlock = false;
      return false;
    }

    if (insideIgnoreBlock) return false;

    return (
      !insideHtmlComment &&
      !/^\s*(\/\/|#|\/\*|\*|<!--|-->)/.test(line) &&
      !hasIgnoreComment(line)
    );
  });
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
    duration: scanResult.stats.duration,
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
  // Start timing the scan
  const startTime = performance.now();

  // Scan the codebase
  let scanResult = await scanCodebase(opts);

  // Filter out commented usages
  scanResult.used = skipCommentedUsages(scanResult.used);

  // Measure duration
  const endTime = performance.now();
  scanResult.stats.duration = (endTime - startTime) / 1000; // Convert to seconds

  // Recalculate stats after filtering
  calculateStats(scanResult);

  // If user explicitly passed --example flag, but the file doesn't exist:
  if (printMissingExample(opts)) {
    return { exitWithError: true };
  }

  const frameworkWarnings = frameworkValidator(scanResult.used, opts.cwd);
  if (frameworkWarnings.length > 0) {
    scanResult.frameworkWarnings = frameworkWarnings;
  }

  // Determine which file to compare against
  const compareFile = determineComparisonFile(opts);
  let envVariables: Record<string, string | undefined> = {};
  let comparedAgainst = '';
  let duplicatesFound = false;

  // Store fix information for consolidated display
  let fixApplied = false;
  let fixedKeys: string[] = [];
  let removedDuplicates: string[] = [];
  let gitignoreUpdated = false;

  // If comparing against a file, process it
  // fx: if the scan is comparing against .env.example, it will check for missing keys there
  if (compareFile) {
    const result = processComparisonFile(scanResult, compareFile, opts);

    if (result.error) {
      const { exit } = printComparisonError(
        result.error.message,
        result.error.shouldExit,
        opts.json ?? false,
      );
      if (exit) return { exitWithError: true };
    } else {
      scanResult = result.scanResult;
      envVariables = result.envVariables;
      comparedAgainst = result.comparedAgainst;
      duplicatesFound = result.duplicatesFound;
      fixApplied = result.fixApplied;
      removedDuplicates = result.removedDuplicates;
      fixedKeys = result.addedEnv;
      gitignoreUpdated = result.gitignoreUpdated;

      if (result.exampleFull && result.comparedAgainst === '.env.example') {
        scanResult.exampleWarnings = detectSecretsInExample(result.exampleFull);
      }
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

    // Check for high severity secrets
    const hasHighSeveritySecrets = (scanResult.secrets ?? []).some(
      (s) => s.severity === 'high',
    );

    // Check for high potential secrets in example warnings
    const hasHighSeverityExampleWarnings = (
      scanResult.exampleWarnings ?? []
    ).some((w) => w.severity === 'high');

    return {
      exitWithError:
        scanResult.missing.length > 0 ||
        duplicatesFound ||
        hasHighSeveritySecrets ||
        hasHighSeverityExampleWarnings ||
        !!(
          (opts.strict &&
            (scanResult.unused.length > 0 ||
              (scanResult.duplicates?.env?.length ?? 0) > 0 ||
              (scanResult.duplicates?.example?.length ?? 0) > 0 ||
              (scanResult.secrets?.length ?? 0) > 0)) ||
          (scanResult.exampleWarnings?.length ?? 0) > 0 ||
          (scanResult.frameworkWarnings?.length ?? 0) > 0 ||
          (scanResult.logged?.length ?? 0) > 0
        ),
    };
  }

  // Console output
  const result = outputToConsole(scanResult, opts, comparedAgainst, {
    fixApplied,
    removedDuplicates,
    addedEnv: fixedKeys,
    gitignoreUpdated,
  });

  return { exitWithError: result.exitWithError || duplicatesFound };
}
