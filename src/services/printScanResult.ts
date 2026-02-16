import { checkGitignoreStatus } from './git.js';
import { printGitignoreWarning } from '../ui/shared/printGitignore.js';
import type {
  ScanUsageOptions,
  ScanResult,
  ExitResult,
  FixContext,
} from '../config/types.js';
import { DEFAULT_ENV_FILE } from '../config/constants.js';
import { printHeader } from '../ui/scan/printHeader.js';
import { printStats } from '../ui/scan/printStats.js';
import { printMissing } from '../ui/scan/printMissing.js';
import { printUnused } from '../ui/scan/printUnused.js';
import { printDuplicates } from '../ui/shared/printDuplicates.js';
import { printSecrets } from '../ui/scan/printSecrets.js';
import { printSuccess } from '../ui/shared/printSuccess.js';
import { printStrictModeError } from '../ui/shared/printStrictModeError.js';
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
  const isJson = opts.json ?? false;

  printHeader(comparedAgainst);

  // Show stats if requested
  printStats(scanResult.stats, isJson, opts.showStats ?? true);

  // Missing variables (used in code but not in env file)
  if (
    printMissing(
      scanResult.missing,
      scanResult.used,
      comparedAgainst,
      opts.isCiMode ?? false,
      isJson,
    )
  ) {
    exitWithError = true;
  }

  if (scanResult.frameworkWarnings && scanResult.frameworkWarnings.length > 0) {
    printFrameworkWarnings(scanResult.frameworkWarnings, isJson);
  }

  if (scanResult.uppercaseWarnings && scanResult.uppercaseWarnings.length > 0) {
    printUppercaseWarning(
      scanResult.uppercaseWarnings,
      comparedAgainst,
      isJson,
    );
  }

  if (
    scanResult.inconsistentNamingWarnings &&
    scanResult.inconsistentNamingWarnings.length > 0
  ) {
    printInconsistentNamingWarning(
      scanResult.inconsistentNamingWarnings,
      isJson,
    );
  }

  printExampleWarnings(scanResult.exampleWarnings ?? [], isJson);

  // Unused
  printUnused(
    scanResult.unused,
    comparedAgainst,
    opts.showUnused ?? false,
    isJson,
  );

  // Duplicates
  printDuplicates(
    comparedAgainst || DEFAULT_ENV_FILE,
    'example file',
    scanResult.duplicates?.env ?? [],
    scanResult.duplicates?.example ?? [],
    isJson,
  );

  // Print potential secrets found
  printSecrets(scanResult.secrets ?? [], isJson);

  // Console log usage warning
  printConsolelogWarning(scanResult.logged ?? [], isJson);

  // Expiration warnings
  printExpireWarnings(scanResult.expireWarnings ?? [], isJson);

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

  // Success message for env file comparison
  if (
    comparedAgainst &&
    scanResult.missing.length === 0 &&
    (scanResult.secrets?.length ?? 0) === 0 &&
    scanResult.used.length > 0
  ) {
    printSuccess(
      isJson,
      'scan',
      comparedAgainst,
      scanResult.unused,
      opts.showUnused ?? true,
    );
  }

  // Gitignore check
  const gitignoreIssue = checkGitignoreStatus({
    cwd: opts.cwd,
    envFile: DEFAULT_ENV_FILE,
  });

  if (gitignoreIssue && !opts.json) {
    printGitignoreWarning({
      envFile: DEFAULT_ENV_FILE,
      reason: gitignoreIssue.reason,
    });
  }

  const hasGitignoreIssue = gitignoreIssue !== null;

  if (opts.strict) {
    const exit = printStrictModeError(
      {
        unused: scanResult.unused.length,
        duplicatesEnv: scanResult.duplicates?.env?.length ?? 0,
        duplicatesEx: scanResult.duplicates?.example?.length ?? 0,
        secrets: scanResult.secrets?.length ?? 0,
        exampleSecrets: scanResult.exampleWarnings?.length ?? 0,
        hasGitignoreIssue,
        frameworkWarnings: scanResult.frameworkWarnings?.length ?? 0,
        logged: scanResult.logged?.length ?? 0,
        uppercaseWarnings: scanResult.uppercaseWarnings?.length ?? 0,
        expireWarnings: scanResult.expireWarnings?.length ?? 0,
        inconsistentNamingWarnings:
          scanResult.inconsistentNamingWarnings?.length ?? 0,
      },
      isJson,
    );

    if (exit) exitWithError = true;
  }

  if (opts.fix && fixContext) {
    printAutoFix(
      fixContext.fixApplied,
      {
        removedDuplicates: fixContext.removedDuplicates,
        addedEnv: fixContext.addedEnv,
      },
      comparedAgainst || DEFAULT_ENV_FILE,
      isJson,
      fixContext.gitignoreUpdated,
    );
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
