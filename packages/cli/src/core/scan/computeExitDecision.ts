import type { ExitResult, ScanResult } from '../../config/types.js';
import {
  EXPIRE_THRESHOLD_DAYS,
  URGENT_EXPIRE_DAYS,
} from '../../config/constants.js';

/**
 * Inputs that affect the exit decision but are not part of {@link ScanResult}.
 */
export interface ExitDecisionOptions {
  /** Whether --strict is enabled, promoting warnings to failures */
  strict?: boolean | undefined;
  /**
   * Whether a .gitignore issue was detected. Only the console output path runs
   * the .gitignore check, so the JSON path leaves this unset — a finding that is
   * never reported must not silently fail the build.
   */
  hasGitignoreIssue?: boolean | undefined;
}

/**
 * Determines whether a scan should exit with a non-zero code.
 *
 * This is the single source of truth shared by every output path, so a finding
 * can never fail the build in one format and pass in another.
 *
 * Two tiers of findings exist:
 *  - Hard failures always exit non-zero: missing keys, high-severity secrets
 *    (in code or in the example file), and keys expiring within
 *    {@link URGENT_EXPIRE_DAYS} days.
 *  - Strict violations only exit non-zero under --strict: every remaining
 *    warning category.
 * @param scanResult - The scan result to evaluate.
 * @param opts - Options affecting the decision (strict mode, .gitignore state).
 * @returns Whether the caller should exit with a non-zero code.
 */
export function computeExitDecision(
  scanResult: ScanResult,
  opts: ExitDecisionOptions = {},
): ExitResult {
  const exitWithError =
    hasHardFailure(scanResult) ||
    (!!opts.strict && hasStrictViolation(scanResult, opts.hasGitignoreIssue));

  return { exitWithError };
}

/**
 * Findings severe enough to fail the build regardless of --strict.
 * @param scan - The scan result to evaluate.
 * @returns True when at least one hard failure was found.
 */
function hasHardFailure(scan: ScanResult): boolean {
  return (
    scan.missing.length > 0 ||
    (scan.secrets ?? []).some((s) => s.severity === 'high') ||
    (scan.exampleWarnings ?? []).some((w) => w.severity === 'high') ||
    (scan.expireWarnings ?? []).some((w) => w.daysLeft <= URGENT_EXPIRE_DAYS)
  );
}

/**
 * Warning-level findings that only fail the build under --strict.
 * @param scan - The scan result to evaluate.
 * @param hasGitignoreIssue - Whether a .gitignore issue was detected.
 * @returns True when at least one strict violation was found.
 */
function hasStrictViolation(
  scan: ScanResult,
  hasGitignoreIssue?: boolean,
): boolean {
  return (
    scan.unused.length > 0 ||
    (scan.duplicates?.env?.length ?? 0) > 0 ||
    (scan.duplicates?.example?.length ?? 0) > 0 ||
    (scan.secrets?.length ?? 0) > 0 ||
    (scan.exampleWarnings?.length ?? 0) > 0 ||
    (scan.frameworkWarnings?.length ?? 0) > 0 ||
    (scan.logged?.length ?? 0) > 0 ||
    (scan.uppercaseWarnings?.length ?? 0) > 0 ||
    (scan.expireWarnings ?? []).some(
      (w) => w.daysLeft <= EXPIRE_THRESHOLD_DAYS,
    ) ||
    (scan.inconsistentNamingWarnings?.length ?? 0) > 0 ||
    (scan.commentWarnings?.length ?? 0) > 0 ||
    !!hasGitignoreIssue
  );
}
