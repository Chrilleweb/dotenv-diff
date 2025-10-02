import chalk from 'chalk';
import { warnIfEnvNotIgnored, isEnvIgnoredByGit } from './git.js';
import type {
  ScanUsageOptions,
  ScanResult,
  EnvUsage,
  VariableUsages,
} from '../config/types.js';
import { printHeader } from '../ui/scan/printHeader.js';

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
  if (opts.showStats) {
    console.log(chalk.magenta('📊 Scan Statistics:'));
    console.log(
      chalk.magenta.dim(`   Files scanned: ${scanResult.stats.filesScanned}`),
    );
    console.log(
      chalk.magenta.dim(
        `   Total usages found: ${scanResult.stats.totalUsages}`,
      ),
    );
    console.log(
      chalk.magenta.dim(
        `   Unique variables: ${scanResult.stats.uniqueVariables}`,
      ),
    );
    console.log();
  }

  // Always show found variables when not comparing or when no missing variables
  if (scanResult.stats.uniqueVariables > 0) {
    console.log(
      chalk.blue(
        `🌐 Found ${scanResult.stats.uniqueVariables} unique environment variables in use`,
      ),
    );
    console.log();

    // List all variables found (if any)
    if (scanResult.stats.uniqueVariables > 0) {
      // Group by variable to get unique list
      const variableUsages = scanResult.used.reduce(
        (acc: VariableUsages, usage: EnvUsage) => {
          if (!acc[usage.variable]) {
            acc[usage.variable] = [];
          }
          acc[usage.variable]!.push(usage);
          return acc;
        },
        {},
      );

      // Display each unique variable
      for (const [variable, usages] of Object.entries(variableUsages)) {
        console.log(chalk.blue(`   ${variable}`));

        // Show usage details if stats are enabled
        if (opts.showStats) {
          const displayUsages = usages.slice(0, 2);
          displayUsages.forEach((usage: EnvUsage) => {
            console.log(
              chalk.blue.dim(
                `     Used in: ${usage.file}:${usage.line} (${usage.pattern})`,
              ),
            );
          });

          if (usages.length > 2) {
            console.log(
              chalk.gray(`     ... and ${usages.length - 2} more locations`),
            );
          }
        }
      }
      console.log();
    }
  }

  // Missing variables (used in code but not in env file)
  if (scanResult.missing.length > 0) {
    exitWithError = true;
    const fileType = comparedAgainst || 'environment file';
    console.log(chalk.red(`❌ Missing in ${fileType}:`));

    const grouped = scanResult.missing.reduce(
      (acc: VariableUsages, variable: string) => {
        const usages = scanResult.used.filter(
          (u: EnvUsage) => u.variable === variable,
        );
        acc[variable] = usages;
        return acc;
      },
      {},
    );

    for (const [variable, usages] of Object.entries(grouped)) {
      console.log(chalk.red(`   - ${variable}`));

      // Show first few usages
      const maxShow = 3;
      usages.slice(0, maxShow).forEach((usage: EnvUsage) => {
        console.log(
          chalk.red.dim(
            `     Used in: ${usage.file}:${usage.line} (${usage.pattern})`,
          ),
        );
      });

      if (usages.length > maxShow) {
        console.log(
          chalk.gray(`     ... and ${usages.length - maxShow} more locations`),
        );
      }
    }
    console.log();

    // CI mode specific message
    if (opts.isCiMode) {
      console.log(
        chalk.red(
          `💥 Found ${scanResult.missing.length} missing environment variable(s).`,
        ),
      );
      console.log(
        chalk.red(
          `   Add these variables to ${comparedAgainst || 'your environment file'} to fix this error.`,
        ),
      );
      console.log();
    }
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
