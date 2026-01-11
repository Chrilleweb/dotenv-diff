import { scanCodebase } from '../services/scanCodebase.js';
import type {
  ScanUsageOptions,
  EnvUsage,
  ExitResult,
  ScanResult,
} from '../config/types.js';
import { determineComparisonFile } from '../core/determineComparisonFile.js';
import { printScanResult } from '../services/printScanResult.js';
import { createJsonOutput } from '../core/scanJsonOutput.js';
import { printMissingExample } from '../ui/scan/printMissingExample.js';
import { processComparisonFile } from '../core/processComparisonFile.js';
import { printComparisonError } from '../ui/scan/printComparisonError.js';
import { hasIgnoreComment } from '../core/secretDetectors.js';
import { frameworkValidator } from '../core/frameworks/frameworkValidator.js';
import { detectSecretsInExample } from '../core/exampleSecretDetector.js';

/**
 * Scans the codebase for environment variable usage and compares it with
 * the selected environment file (.env or .env.example).
 *
 * This function performs the following:
 *  - Scans the codebase for used environment variables
 *  - Strips out usages found in commented code
 *  - Detects missing variables, unused variables, duplicates, and secrets
 *  - Determines which file to compare against based on CLI flags and config
 *  - Optionally auto-fixes missing keys, duplicate keys, and .gitignore entries
 *  - Validates usage patterns for specific frameworks (Next.js, Vite, etc.)
 *  - Outputs results in JSON or console format
 *  - Returns a boolean indicating whether the process should exit with an error
 *
 * @param {ScanUsageOptions} opts - Scan configuration options
 * @returns {Promise<ExitResult>} Whether the caller should exit with a non-zero code.
 */
export async function scanUsage(opts: ScanUsageOptions): Promise<ExitResult> {
  // Start timing the scan
  const startTime = performance.now();

  // Scan the codebase
  let scanResult = await scanCodebase(opts);

  // Filter out commented usages
  scanResult.used = skipCommentedUsages(scanResult.used);

  // Measure duration
  const endTime = performance.now();
  scanResult.stats.duration = (endTime - startTime) / 1000; // Convert to seconds

  // If user explicitly passed --example flag, but the file doesn't exist:
  if (printMissingExample(opts)) {
    return { exitWithError: true };
  }

  const frameworkWarnings = frameworkValidator(
    scanResult.used,
    opts.cwd,
    scanResult.fileContentMap,
  );
  if (frameworkWarnings.length > 0) {
    scanResult.frameworkWarnings = frameworkWarnings;
  }

  // Determine which file to compare against
  const compareFile = determineComparisonFile(opts);
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
      comparedAgainst = result.comparedAgainst;
      duplicatesFound = result.duplicatesFound;
      fixApplied = result.fixApplied;
      removedDuplicates = result.removedDuplicates;
      fixedKeys = result.addedEnv;
      gitignoreUpdated = result.gitignoreUpdated;
      if (result.uppercaseWarnings) {
        scanResult.uppercaseWarnings = result.uppercaseWarnings;
      }
      if (result.expireWarnings) {
        scanResult.expireWarnings = result.expireWarnings;
      }
      if (result.inconsistentNamingWarnings) {
        scanResult.inconsistentNamingWarnings =
          result.inconsistentNamingWarnings;
      }
      if (result.exampleFull && result.comparedAgainst === '.env.example') {
        scanResult.exampleWarnings = detectSecretsInExample(result.exampleFull);
      }
    }
  }

  // Recalculate stats after filtering
  calculateStats(scanResult);

  // JSON output
  if (opts.json) {
    const jsonOutput = createJsonOutput(scanResult, comparedAgainst);
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
              (scanResult.secrets?.length ?? 0) > 0 ||
              (scanResult.frameworkWarnings?.length ?? 0) > 0 ||
              (scanResult.logged?.length ?? 0) > 0 ||
              (scanResult.uppercaseWarnings?.length ?? 0) > 0 ||
              (scanResult.expireWarnings?.length ?? 0) > 0 ||
              (scanResult.inconsistentNamingWarnings?.length ?? 0) > 0)) ||
          (scanResult.exampleWarnings?.length ?? 0) > 0
        ),
    };
  }

  // Console output
  const result = printScanResult(scanResult, opts, comparedAgainst, {
    fixApplied,
    removedDuplicates,
    addedEnv: fixedKeys,
    gitignoreUpdated,
  });

  return { exitWithError: result.exitWithError || duplicatesFound };
}

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
function skipCommentedUsages(usages: readonly EnvUsage[]): EnvUsage[] {
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

  const warningsCount =
    (scanResult.frameworkWarnings?.length ?? 0) +
    (scanResult.exampleWarnings?.length ?? 0) +
    (scanResult.logged?.length ?? 0) +
    (scanResult.uppercaseWarnings?.length ?? 0) +
    (scanResult.expireWarnings?.length ?? 0) +
    (scanResult.inconsistentNamingWarnings?.length ?? 0) +
    (scanResult.secrets?.length ?? 0) +
    (scanResult.missing.length ?? 0) +
    (scanResult.unused.length ?? 0) +
    (scanResult.duplicates?.env?.length ?? 0) +
    (scanResult.duplicates?.example?.length ?? 0);

  scanResult.stats = {
    filesScanned: scanResult.stats.filesScanned,
    totalUsages: scanResult.used.length,
    uniqueVariables,
    warningsCount: warningsCount,
    duration: scanResult.stats.duration,
  };

  return scanResult;
}
