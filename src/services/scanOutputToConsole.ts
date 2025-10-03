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

  // Unused variables (in env file but not used in code)
  if (opts.showUnused && scanResult.unused.length > 0) {
    const fileType = comparedAgainst || 'environment file';
    console.log(
      chalk.yellow(`⚠️  Unused in codebase (defined in ${fileType}):`),
    );
    scanResult.unused.forEach((variable: string) => {
      console.log(chalk.yellow(`   - ${variable}`));
    });
    console.log();
  }

  // Show duplicates if found - NOW AFTER UNUSED VARIABLES
  if (scanResult.duplicates?.env && scanResult.duplicates.env.length > 0) {
    console.log(
      chalk.yellow(
        `⚠️  Duplicate keys in ${comparedAgainst} (last occurrence wins):`,
      ),
    );
    scanResult.duplicates.env.forEach(({ key, count }) =>
      console.log(chalk.yellow(`   - ${key} (${count} occurrences)`)),
    );
    console.log();
  }

  if (
    scanResult.duplicates?.example &&
    scanResult.duplicates.example.length > 0
  ) {
    console.log(
      chalk.yellow(
        '⚠️  Duplicate keys in example file (last occurrence wins):',
      ),
    );
    scanResult.duplicates.example.forEach(({ key, count }) =>
      console.log(chalk.yellow(`   - ${key} (${count} occurrences)`)),
    );
    console.log();
  }

  if (scanResult.secrets && scanResult.secrets.length > 0) {
    console.log(chalk.yellow('🔒 Potential secrets detected in codebase:'));
    const byFile = new Map<string, typeof scanResult.secrets>();
    for (const f of scanResult.secrets) {
      if (!byFile.has(f.file)) byFile.set(f.file, []);
      byFile.get(f.file)!.push(f);
    }
    for (const [file, findings] of byFile) {
      console.log(chalk.bold(`  ${file}`));
      for (const f of findings) {
        console.log(
          chalk.yellow(
            `   - Line ${f.line}: ${f.message}\n     ${chalk.dim(f.snippet)}`,
          ),
        );
      }
    }
    console.log();
  }

  // Success message for env file comparison
  if (
    comparedAgainst &&
    scanResult.missing.length === 0 &&
    scanResult.secrets.length > 0 &&
    scanResult.used.length > 0
  ) {
    console.log(
      chalk.green(
        `✅ All used environment variables are defined in ${comparedAgainst}`,
      ),
    );

    if (opts.showUnused && scanResult.unused.length === 0) {
      console.log(chalk.green('✅ No unused environment variables found'));
    }
    console.log();
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
