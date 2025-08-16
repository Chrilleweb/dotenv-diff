import chalk from 'chalk';
import { parseEnvFile } from '../lib/parseEnv.js';
import {
  scanCodebase,
  compareWithEnvFiles,
  type ScanOptions,
  type ScanResult,
  type EnvUsage,
} from '../services/codeBaseScanner.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';

export interface ScanUsageOptions extends ScanOptions {
  envPath?: string;
  json: boolean;
  showUnused: boolean;
  showStats: boolean;
}

export interface ScanJsonEntry {
  stats: {
    filesScanned: number;
    totalUsages: number;
    uniqueVariables: number;
  };
  missing: Array<{
    variable: string;
    usages: Array<{
      file: string;
      line: number;
      pattern: string;
      context: string;
    }>;
  }>;
  unused: string[];
  allUsages?: Array<{
    variable: string;
    file: string;
    line: number;
    pattern: string;
    context: string;
  }>;
}

// Type for grouped usages by variable
interface VariableUsages {
  [variable: string]: EnvUsage[];
}

/**
 * Scans codebase for environment variable usage and compares with .env file
 * @param {ScanUsageOptions} opts - Scan configuration options
 * @param {string} [opts.envPath] - Path to .env file for comparison
 * @param {boolean} opts.json - Output as JSON instead of console
 * @param {boolean} opts.showUnused - Show unused variables from .env
 * @param {boolean} opts.showStats - Show detailed statistics
 * @returns {Promise<{exitWithError: boolean}>} Returns true if missing variables found
 */
export async function scanUsage(
  opts: ScanUsageOptions,
): Promise<{ exitWithError: boolean }> {
  if (!opts.json) {
    console.log(
      chalk.bold('🔍 Scanning codebase for environment variable usage...'),
    );
    console.log();
  }

  // Scan the codebase
  let scanResult = await scanCodebase(opts);

  // If we have an env file, compare with it
  let envVariables: Record<string, string | undefined> = {};
  if (opts.envPath) {
    try {
      const envFull = parseEnvFile(opts.envPath);
      const envKeys = filterIgnoredKeys(
        Object.keys(envFull),
        opts.ignore,
        opts.ignoreRegex,
      );
      envVariables = Object.fromEntries(envKeys.map((k) => [k, envFull[k]]));
      scanResult = compareWithEnvFiles(scanResult, envVariables);
    } catch (error) {
      if (!opts.json) {
        console.log(
          chalk.yellow(
            `⚠️  Could not read env file: ${opts.envPath} - ${error}`,
          ),
        );
      }
    }
  }

  // Prepare JSON output
  if (opts.json) {
    const jsonOutput = createJsonOutput(scanResult, opts);
    console.log(JSON.stringify(jsonOutput, null, 2));
    return { exitWithError: scanResult.missing.length > 0 };
  }

  // Console output
  return outputToConsole(scanResult, opts);
}

function createJsonOutput(
  scanResult: ScanResult,
  opts: ScanUsageOptions,
): ScanJsonEntry {
  // Group usages by variable for missing variables
  const missingGrouped = scanResult.missing.map((variable: string) => ({
    variable,
    usages: scanResult.used
      .filter((u: EnvUsage) => u.variable === variable)
      .map((u: EnvUsage) => ({
        file: u.file,
        line: u.line,
        pattern: u.pattern,
        context: u.context,
      })),
  }));

  const output: ScanJsonEntry = {
    stats: scanResult.stats,
    missing: missingGrouped,
    unused: scanResult.unused,
  };

  // Optionally include all usages
  if (opts.showStats) {
    output.allUsages = scanResult.used.map((u: EnvUsage) => ({
      variable: u.variable,
      file: u.file,
      line: u.line,
      pattern: u.pattern,
      context: u.context,
    }));
  }

  return output;
}

function outputToConsole(
  scanResult: ScanResult,
  opts: ScanUsageOptions,
): { exitWithError: boolean } {
  let exitWithError = false;

  // Show stats if requested
  if (opts.showStats) {
    console.log(chalk.bold('📊 Scan Statistics:'));
    console.log(
      chalk.gray(`   Files scanned: ${scanResult.stats.filesScanned}`),
    );
    console.log(
      chalk.gray(`   Total usages found: ${scanResult.stats.totalUsages}`),
    );
    console.log(
      chalk.gray(`   Unique variables: ${scanResult.stats.uniqueVariables}`),
    );
    console.log();
  }

  // Always show found variables when not in .env comparison mode
  if (!opts.envPath || scanResult.missing.length === 0) {
    console.log(
      chalk.green(
        `✅ Found ${scanResult.stats.uniqueVariables} unique environment variables in use`,
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
          acc[usage.variable].push(usage);
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
              chalk.gray(
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

  // Missing variables (used in code but not in .env)
  if (scanResult.missing.length > 0) {
    exitWithError = true;
    console.log(chalk.red('❌ Missing in .env:'));

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
          chalk.gray(
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
  }

  // Unused variables (in .env but not used in code)
  if (opts.showUnused && scanResult.unused.length > 0) {
    console.log(chalk.yellow('⚠️  Unused in codebase:'));
    scanResult.unused.forEach((variable: string) => {
      console.log(chalk.yellow(`   - ${variable}`));
    });
    console.log();
  }

  // Success message for .env comparison
  if (opts.envPath && scanResult.missing.length === 0) {
    console.log(
      chalk.green('✅ All used environment variables are defined in .env'),
    );

    if (opts.showUnused && scanResult.unused.length === 0) {
      console.log(chalk.green('✅ No unused environment variables found'));
    }
  }

  return { exitWithError };
}
