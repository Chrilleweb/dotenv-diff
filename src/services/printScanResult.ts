import { checkGitignoreStatus } from './git.js';
import { printGitignoreWarning } from '../ui/shared/printGitignore.js';
import type {
  ScanUsageOptions,
  ScanResult,
  ExitResult,
  FixContext,
} from '../config/types.js';
import {
  DEFAULT_ENV_FILE,
  EXPIRE_THRESHOLD_DAYS,
} from '../config/constants.js';
import { printHeader } from '../ui/scan/printHeader.js';
import { printStats } from '../ui/scan/printStats.js';
import { printMissing } from '../ui/scan/printMissing.js';
import { printUnused } from '../ui/scan/printUnused.js';
import { printDuplicates } from '../ui/shared/printDuplicates.js';
import { printSecrets } from '../ui/scan/printSecrets.js';
import { printFixTips } from '../ui/shared/printFixTips.js';
import { printAutoFix } from '../ui/shared/printAutoFix.js';
import { printFrameworkWarnings } from '../ui/scan/printFrameworkWarnings.js';
import { printExampleWarnings } from '../ui/scan/printExampleWarnings.js';
import { printConsolelogWarning } from '../ui/scan/printConsolelogWarning.js';
import { printUppercaseWarning } from '../ui/scan/printUppercaseWarning.js';
import { computeHealthScore } from '../core/scan/computeHealthScore.js';
import { printHealthScore } from '../ui/scan/printHealthScore.js';
import { printExpireWarnings } from '../ui/scan/printExpireWarnings.js';
import { printInconsistentNamingWarning } from '../ui/scan/printInconsistentNamingWarning.js';

/**
 * Prints the scan result to the console.
 * @param scanResult - The result of the scan.
 * @param opts - The scan options.
 * @param comparedAgainst - The file being compared against.
 * @returns An object indicating whether to exit with an error.
 */
export function printScanResult(
  scanResult: ScanResult,
  opts: ScanUsageOptions,
  comparedAgainst: string,
  fixContext?: FixContext,
): ExitResult {
  let exitWithError = false;

  // Determine if output should be in JSON format
  const isJson = opts.json;

  printHeader(comparedAgainst);

  // Show stats if requested
  if (opts.showStats ?? true) {
    printStats(scanResult.stats, true);
  }

  // Missing variables (used in code but not in env file)
  if (printMissing(scanResult.missing, scanResult.used, comparedAgainst)) {
    exitWithError = true;
  }

  if (scanResult.frameworkWarnings) {
    printFrameworkWarnings(scanResult.frameworkWarnings, opts.strict);
  }

  if (scanResult.uppercaseWarnings) {
    printUppercaseWarning(
      scanResult.uppercaseWarnings,
      comparedAgainst,
      opts.strict,
    );
  }

  if (scanResult.inconsistentNamingWarnings) {
    printInconsistentNamingWarning(
      scanResult.inconsistentNamingWarnings,
      opts.strict,
    );
  }

  if (scanResult.exampleWarnings) {
    printExampleWarnings(scanResult.exampleWarnings, opts.strict);
  }

  // Unused
  if (opts.showUnused ?? true) {
    printUnused(scanResult.unused, comparedAgainst, opts.strict);
  }

  // Duplicates
  printDuplicates(
    comparedAgainst || DEFAULT_ENV_FILE,
    'example file',
    scanResult.duplicates?.env ?? [],
    scanResult.duplicates?.example ?? [],
    isJson,
    opts.fix ?? false,
    opts.strict,
  );

  // Print potential secrets found
  if (opts.secrets) {
    printSecrets(scanResult.secrets, opts.strict);
  }
  // Console log usage warning
  if (scanResult.logged) {
    printConsolelogWarning(scanResult.logged, opts.strict);
  }

  // Expiration warnings
  if (scanResult.expireWarnings) {
    printExpireWarnings(scanResult.expireWarnings);
  }
  // Check for high severity secrets - ALWAYS exit with error
  const hasHighSeveritySecrets = (scanResult.secrets ?? []).some(
    (s) => s.severity === 'high',
  );

  if (hasHighSeveritySecrets) {
    exitWithError = true;
  }

  // Check for high severity example secrets - ALWAYS exit with error
  const hasHighSeverityExampleSecrets = (scanResult.exampleWarnings ?? []).some(
    (w) => w.severity === 'high',
  );

  if (hasHighSeverityExampleSecrets) {
    exitWithError = true;
  }

  // Gitignore check
  const gitignoreIssue = checkGitignoreStatus({
    cwd: opts.cwd,
    envFile: DEFAULT_ENV_FILE,
  });

  if (gitignoreIssue) {
    printGitignoreWarning({
      envFile: DEFAULT_ENV_FILE,
      reason: gitignoreIssue.reason,
      strict: opts.strict ?? false,
    });
  }

  const hasGitignoreIssue = gitignoreIssue !== null;

  if (opts.strict) {
    const hasStrictViolations =
      scanResult.unused.length > 0 ||
      (scanResult.duplicates?.env?.length ?? 0) > 0 ||
      (scanResult.duplicates?.example?.length ?? 0) > 0 ||
      (scanResult.secrets?.length ?? 0) > 0 ||
      (scanResult.exampleWarnings?.length ?? 0) > 0 ||
      hasGitignoreIssue ||
      (scanResult.frameworkWarnings?.length ?? 0) > 0 ||
      (scanResult.logged?.length ?? 0) > 0 ||
      (scanResult.uppercaseWarnings?.length ?? 0) > 0 ||
      (scanResult.expireWarnings?.filter(
        (w) => w.daysLeft <= EXPIRE_THRESHOLD_DAYS,
      ).length ?? 0) > 0 ||
      (scanResult.inconsistentNamingWarnings?.length ?? 0) > 0;

    if (hasStrictViolations) exitWithError = true;
  }

  if (opts.fix && fixContext) {
    printAutoFix(fixContext, comparedAgainst || DEFAULT_ENV_FILE, isJson);
  }

  // Health score
  const score = computeHealthScore(scanResult);
  printHealthScore(score);

  // Filtered results for fix tips
  printFixTips(
    {
      missing: scanResult.missing,
      duplicatesEnv: scanResult.duplicates?.env ?? [],
      duplicatesEx: scanResult.duplicates?.example ?? [],
      gitignoreIssue: hasGitignoreIssue ? { reason: 'not-ignored' } : null,
    },
    hasGitignoreIssue,
    isJson,
    opts.fix ?? false,
  );

  return { exitWithError };
}
