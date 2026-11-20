import { checkGitignoreStatus } from '../../services/git.js';
import { printGitignoreWarning } from '../shared/printGitignore.js';
import type {
  ScanUsageOptions,
  ScanResult,
  ExitResult,
  FixContext,
} from '../../config/types.js';
import { DEFAULT_ENV_FILE } from '../../config/constants.js';
import { printHeader } from './printHeader.js';
import { printStats } from './printStats.js';
import { printMissing } from './printMissing.js';
import { printUnused } from './printUnused.js';
import { printDuplicates } from '../shared/printDuplicates.js';
import { printSecrets } from './printSecrets.js';
import { printFixTips } from '../shared/printFixTips.js';
import { printAutoFix } from '../shared/printAutoFix.js';
import { printFrameworkWarnings } from './printFrameworkWarnings.js';
import { printExampleWarnings } from './printExampleWarnings.js';
import { printConsolelogWarning } from './printConsolelogWarning.js';
import { printUppercaseWarning } from './printUppercaseWarning.js';
import { computeHealthScore } from '../../core/scan/computeHealthScore.js';
import { computeExitDecision } from '../../core/scan/computeExitDecision.js';
import { printHealthScore } from './printHealthScore.js';
import { printExpireWarnings } from './printExpireWarnings.js';
import { printCommentWarnings } from './printCommentWarnings.js';
import { printDriftWarnings } from './printDriftWarnings.js';
import { printInconsistentNamingWarning } from './printInconsistentNamingWarning.js';
import { printListAll } from './printListAll.js';

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
  if (opts.showStats) {
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
  if (opts.showUnused) {
    printUnused(scanResult.unused, comparedAgainst, opts.strict);
  }

  // Duplicates
  printDuplicates(
    comparedAgainst || DEFAULT_ENV_FILE,
    scanResult.exampleFile || 'example file',
    scanResult.duplicates?.env ?? [],
    scanResult.duplicates?.example ?? [],
    isJson,
    opts.fix,
    opts.strict,
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
      strict: opts.strict,
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
    opts.fix,
  );

  return { exitWithError };
}
