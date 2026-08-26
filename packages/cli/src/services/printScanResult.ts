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
import { printFixTips } from '../ui/shared/printFixTips.js';
import { printAutoFix } from '../ui/shared/printAutoFix.js';
import { printFrameworkWarnings } from '../ui/scan/printFrameworkWarnings.js';
import { printExampleWarnings } from '../ui/scan/printExampleWarnings.js';
import { printConsolelogWarning } from '../ui/scan/printConsolelogWarning.js';
import { printUppercaseWarning } from '../ui/scan/printUppercaseWarning.js';
import { computeHealthScore } from '../core/scan/computeHealthScore.js';
import { computeExitDecision } from '../core/scan/computeExitDecision.js';
import { printHealthScore } from '../ui/scan/printHealthScore.js';
import { printExpireWarnings } from '../ui/scan/printExpireWarnings.js';
import { printCommentWarnings } from '../ui/scan/printCommentWarnings.js';
import { printDriftWarnings } from '../ui/scan/printDriftWarnings.js';
import { printInconsistentNamingWarning } from '../ui/scan/printInconsistentNamingWarning.js';
import { printListAll } from '../ui/scan/printListAll.js';

/**
 * Prints the scan result to the console.
 * @param scanResult - The result of the scan.
 * @param opts - The scan options.
 * @param comparedAgainst - The file being compared against.
 * @param fixContext - What `--fix` changed, when it ran.
 * @returns An object indicating whether to exit with an error.
 */
export function printScanResult(
  scanResult: ScanResult,
  opts: ScanUsageOptions,
  comparedAgainst: string,
  fixContext?: FixContext,
): ExitResult {
  // Determine if output should be in JSON format
  const isJson = opts.json;

  if (opts.listAll) {
    printListAll(scanResult.used);
  }

  printHeader(comparedAgainst);

  // Show stats if requested
  if (opts.showStats ?? true) {
    printStats(scanResult.stats, true);
  }

  // Missing variables (used in code but not in env file)
  printMissing(
    scanResult.missing,
    scanResult.used,
    comparedAgainst,
    scanResult.suggestions ?? [],
  );

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

  // Unused
  if (opts.showUnused ?? true) {
    printUnused(scanResult.unused, comparedAgainst, opts.strict);
  }

  // Duplicates
  printDuplicates(
    comparedAgainst || DEFAULT_ENV_FILE,
    scanResult.duplicates?.env ?? [],
    scanResult.duplicates?.example ?? [],
    isJson,
    opts.fix ?? false,
    opts.strict,
    scanResult.exampleFile,
  );

  // Print potential secrets found
  if (opts.secrets) {
    printSecrets(scanResult.secrets, opts.strict);
  }
  if (scanResult.exampleWarnings) {
    printExampleWarnings(scanResult.exampleWarnings, opts.strict);
  }

  // Console log usage warning
  if (scanResult.logged?.length) {
    printConsolelogWarning(scanResult.logged, opts.strict);
  }

  // Expiration warnings
  if (scanResult.expireWarnings) {
    printExpireWarnings(scanResult.expireWarnings, opts.strict);
  }
  // Undocumented example keys
  if (scanResult.commentWarnings) {
    printCommentWarnings(scanResult.commentWarnings, opts.strict);
  }
  // Keys in an env file that never made it into the example documenting it
  if (scanResult.driftWarnings) {
    printDriftWarnings(scanResult.driftWarnings, opts.strict);
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

  const { exitWithError } = computeExitDecision(scanResult, {
    strict: opts.strict,
    hasGitignoreIssue,
  });

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
