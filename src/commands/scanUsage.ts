import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { parseEnvFile } from '../lib/parseEnv.js';
import {
  scanCodebase,
  compareWithEnvFiles,
  type ScanOptions,
  type ScanResult,
  type EnvUsage,
} from '../services/codeBaseScanner.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';

const resolveFromCwd = (cwd: string, p: string) =>
  path.isAbsolute(p) ? p : path.resolve(cwd, p);

export interface ScanUsageOptions extends ScanOptions {
  envPath?: string;
  examplePath?: string;
  fix?: boolean;
  json: boolean;
  showUnused: boolean;
  showStats: boolean;
  isCiMode?: boolean;
  files?: string[];
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
  // Add comparison info
  comparedAgainst?: string;
  totalEnvVariables?: number;
}

// Type for grouped usages by variable
interface VariableUsages {
  [variable: string]: EnvUsage[];
}

/**
 * Scans codebase for environment variable usage and compares with .env file
 * @param {ScanUsageOptions} opts - Scan configuration options
 * @param {string} [opts.envPath] - Path to .env file for comparison
 * @param {string} [opts.examplePath] - Path to .env.example file for comparison
 * @param {boolean} opts.json - Output as JSON instead of console
 * @param {boolean} opts.showUnused - Show unused variables from .env
 * @param {boolean} opts.showStats - Show detailed statistics
 * @param {boolean} [opts.isCiMode] - Run in CI mode (exit with error code)
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

  // If user explicitly passed --example but the file doesn't exist:
  if (opts.examplePath) {
    const exampleAbs = resolveFromCwd(opts.cwd, opts.examplePath);
    const missing = !fs.existsSync(exampleAbs);

    if (missing) {
      const msg = `❌ Missing specified example file: ${opts.examplePath}`;
      if (opts.isCiMode) {
        // IMPORTANT: stdout (console.log), not stderr, to satisfy the test
        console.log(chalk.red(msg));
        return { exitWithError: true };
      } else if (!opts.json) {
        console.log(chalk.yellow(msg.replace('❌', '⚠️')));
      }
      // Non-CI: continue without comparison
    }
  }

  // Determine which file to compare against
  const compareFile = determineComparisonFile(opts);
  let envVariables: Record<string, string | undefined> = {};
  let comparedAgainst = '';

  if (compareFile) {
    try {
      const envFull = parseEnvFile(compareFile.path);
      const envKeys = filterIgnoredKeys(
        Object.keys(envFull),
        opts.ignore,
        opts.ignoreRegex,
      );
      envVariables = Object.fromEntries(envKeys.map((k) => [k, envFull[k]]));
      scanResult = compareWithEnvFiles(scanResult, envVariables);
      comparedAgainst = compareFile.name;
    } catch (error) {
      const errorMessage = `⚠️  Could not read ${compareFile.name}: ${compareFile.path} - ${error}`;

      if (opts.isCiMode) {
        // In CI mode, exit with error if file doesn't exist
        console.log(chalk.red(`❌ ${errorMessage}`));
        return { exitWithError: true };
      }

      if (!opts.json) {
        console.log(chalk.yellow(errorMessage));
      }
    }
  }

  // Store fix information for later display
  let fixApplied = false;
  let fixedKeys: string[] = [];

  if (opts.fix && compareFile) {
    const missingKeys = scanResult.missing;

    if (missingKeys.length > 0) {
      const envFilePath = compareFile.path;
      const exampleFilePath = opts.examplePath
        ? resolveFromCwd(opts.cwd, opts.examplePath)
        : null;

      // Append missing keys to .env
      const content = fs.readFileSync(envFilePath, 'utf-8');
      const newContent =
        content +
        (content.endsWith('\n') ? '' : '\n') +
        missingKeys.map((k) => `${k}=`).join('\n') +
        '\n';
      fs.writeFileSync(envFilePath, newContent);

      // Append to .env.example if it exists
      if (exampleFilePath && fs.existsSync(exampleFilePath)) {
        const exContent = fs.readFileSync(exampleFilePath, 'utf-8');
        const existingExKeys = new Set(
          exContent
            .split('\n')
            .map((l) => l.trim().split('=')[0])
            .filter(Boolean),
        );
        const newKeys = missingKeys.filter((k) => !existingExKeys.has(k));
        if (newKeys.length) {
          const newExContent =
            exContent +
            (exContent.endsWith('\n') ? '' : '\n') +
            newKeys.join('\n') +
            '\n';
          fs.writeFileSync(exampleFilePath, newExContent);
        }
      }

      fixApplied = true;
      fixedKeys = missingKeys;
      scanResult.missing = [];
    }
  }

  // Prepare JSON output
  if (opts.json) {
    const jsonOutput = createJsonOutput(
      scanResult,
      opts,
      comparedAgainst,
      Object.keys(envVariables).length,
    );
    console.log(JSON.stringify(jsonOutput, null, 2));
    return { exitWithError: scanResult.missing.length > 0 };
  }

  // Console output
  const result = outputToConsole(scanResult, opts, comparedAgainst);

  // Show fix message at the bottom (after all other output)
  if (fixApplied && !opts.json) {
    console.log(chalk.green('✅ Auto-fix applied (scan mode):'));
    if (compareFile) {
      console.log(
        chalk.green(
          `   - Added ${fixedKeys.length} missing keys to ${compareFile.name}: ${fixedKeys.join(', ')}`,
        ),
      );
    }
    if (opts.examplePath) {
      console.log(
        chalk.green(
          `   - Synced ${fixedKeys.length} keys to ${path.basename(opts.examplePath)}`,
        ),
      );
    }
    console.log();
  } else if (opts.fix && !fixApplied && !opts.json) {
    console.log(chalk.green('✅ Auto-fix applied: no changes needed.'));
    console.log();
  }

    if (scanResult.missing.length > 0 && !opts.json && !opts.fix) {
    console.log(
      chalk.gray('💡 Tip: Run with `--fix` to add missing keys'),
    );
    console.log();
  }

  return result;
}

/**
 * Determines which file to use for comparison based on provided options
 */
function determineComparisonFile(
  opts: ScanUsageOptions,
): { path: string; name: string } | null {
  // Priority: explicit flags first, then auto-discovery
  if (opts.examplePath) {
    const p = resolveFromCwd(opts.cwd, opts.examplePath);
    if (fs.existsSync(p)) {
      return { path: p, name: path.basename(opts.examplePath) };
    }
  }

  if (opts.envPath) {
    const p = resolveFromCwd(opts.cwd, opts.envPath);
    if (fs.existsSync(p)) {
      return { path: p, name: path.basename(opts.envPath) };
    }
  }

  // Auto-discovery: look for common env files relative to cwd
  const candidates = ['.env', '.env.example', '.env.local', '.env.production'];
  for (const candidate of candidates) {
    const fullPath = path.resolve(opts.cwd, candidate);
    if (fs.existsSync(fullPath)) {
      return { path: fullPath, name: candidate };
    }
  }

  return null;
}

function createJsonOutput(
  scanResult: ScanResult,
  opts: ScanUsageOptions,
  comparedAgainst: string,
  totalEnvVariables: number,
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

  if (scanResult.secrets?.length) {
    (output as any).secrets = scanResult.secrets.map((s) => ({
      file: s.file,
      line: s.line,
      message: s.message,
      snippet: s.snippet,
    }));
  }

  // Add comparison info if we compared against a file
  if (comparedAgainst) {
    output.comparedAgainst = comparedAgainst;
    output.totalEnvVariables = totalEnvVariables;
  }

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
  comparedAgainst: string,
): { exitWithError: boolean } {
  let exitWithError = false;

  // Show what we're comparing against
  if (comparedAgainst) {
    console.log(
      chalk.gray(`📋 Comparing codebase usage against: ${comparedAgainst}`),
    );
    console.log();
  }

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

  // Always show found variables when not comparing or when no missing variables
  if (!comparedAgainst || scanResult.missing.length === 0) {
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
  if (comparedAgainst && scanResult.missing.length === 0) {
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

  return { exitWithError };
}
