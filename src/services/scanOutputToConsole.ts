import chalk from 'chalk';
import { warnIfEnvNotIgnored, isEnvIgnoredByGit } from './git.js';
import type {
  ScanUsageOptions,
  ScanResult,
  EnvUsage,
  VariableUsages,
} from '../config/types.js';
import { printHeader } from '../ui/scan/printHeader.js';
import { printStats } from '../ui/scan/printStats.js';
import { printUniqueVariables } from '../ui/scan/printUniqueVariables.js';
import { printVariables } from '../ui/scan/printVariables.js';
import { printMissing } from '../ui/scan/printMissing.js';
import { printUnused } from '../ui/scan/printUnused.js';
import { printDuplicates } from '../ui/shared/printDuplicates.js';
import { printSecrets } from '../ui/scan/printSecrets.js';
import { printSuccess } from '../ui/shared/printSuccess.js';

/**
 * Outputs the scan results to the console.
 * @param scanResult - The result of the scan.
 * @param opts - The scan options.
 * @param comparedAgainst - The file being compared against.
 * @returns An object indicating whether to exit with an error.
 */
export function outputToConsole(
  scanResult: ScanResult,
  opts: ScanUsageOptions,
  comparedAgainst: string,
): { exitWithError: boolean } {
  let exitWithError = false;

  printHeader(comparedAgainst);

  // Show stats if requested
  printStats(scanResult.stats, opts.json ?? false, opts.showStats ?? true);

  // Show used variables if any found
  if (scanResult.stats.uniqueVariables > 0) {
    // Show unique variables found
    printUniqueVariables(scanResult.stats.uniqueVariables);
    // Print used variables with locations
    printVariables(
      scanResult.used,
      opts.showStats ?? false,
      opts.json ?? false,
    );
  }

  // Missing variables (used in code but not in env file)
  if (
    printMissing(
      scanResult.missing,
      scanResult.used,
      comparedAgainst,
      opts.isCiMode ?? false,
      opts.json ?? false,
    )
  ) {
    exitWithError = true;
  }

  // Unused
  printUnused(
    scanResult.unused,
    comparedAgainst,
    opts.showUnused ?? false,
    opts.json ?? false,
  );

  // Duplicates
  printDuplicates(
    comparedAgainst || '.env',
    'example file',
    scanResult.duplicates?.env ?? [],
    scanResult.duplicates?.example ?? [],
    opts.json ?? false,
  );

  // Print potential secrets found
  printSecrets(scanResult.secrets ?? [], opts.json ?? false);

  // Success message for env file comparison
  if (
    comparedAgainst &&
    scanResult.missing.length === 0 &&
    (scanResult.secrets?.length ?? 0) === 0 &&
    scanResult.used.length > 0
  ) {
    printSuccess(
      opts.json ?? false,
      'scan',
      comparedAgainst,
      scanResult.unused,
      opts.showUnused ?? true,
    );
  }

  let envNotIgnored = false;
  if (!opts.json && !opts.fix) {
    // Kun vis advarsel i non-fix mode; i fix-mode har vi lige forsøgt at rette det.
    warnIfEnvNotIgnored({ cwd: opts.cwd, envFile: '.env' });
    const ignored = isEnvIgnoredByGit({ cwd: opts.cwd, envFile: '.env' });
    if (ignored === false || ignored === null) {
      envNotIgnored = true;
    }
  }

  if (opts.strict) {
    const hasWarnings =
      scanResult.unused.length > 0 ||
      (scanResult.duplicates?.env?.length ?? 0) > 0 ||
      (scanResult.duplicates?.example?.length ?? 0) > 0 ||
      (scanResult.secrets?.length ?? 0) > 0 ||
      envNotIgnored;

    if (hasWarnings) {
      exitWithError = true;

      const warnings: string[] = [];
      if (scanResult.unused.length > 0) warnings.push('unused variables');
      if ((scanResult.duplicates?.env?.length ?? 0) > 0)
        warnings.push('duplicate keys in env');
      if ((scanResult.duplicates?.example?.length ?? 0) > 0)
        warnings.push('duplicate keys in example');
      if ((scanResult.secrets?.length ?? 0) > 0)
        warnings.push('potential secrets');
      if (envNotIgnored) warnings.push('.env not ignored by git');

      console.log(
        chalk.red(`💥 Strict mode: Error on warnings → ${warnings.join(', ')}`),
      );
      console.log();
    }
  }

  return { exitWithError };
}
