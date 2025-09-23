import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { parseEnvFile } from '../core/parseEnv.js';
import { scanCodebase } from '../services/codeBaseScanner.js';
import type { ScanUsageOptions, EnvUsage } from '../config/types.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';
import { resolveFromCwd } from '../core/helpers/resolveFromCwd.js';
import { determineComparisonFile } from '../core/determineComparisonFile.js';
import { outputToConsole } from '../services/scanOutputToConsole.js';
import { createJsonOutput } from '../core/scanJsonOutput.js';
import { findDuplicateKeys } from '../services/duplicates.js';
import { compareWithEnvFiles } from '../core/compareScan.js';
import { applyFixes } from '../core/fixEnv.js';

/**
 * Scans codebase for environment variable usage and compares with .env file
 * @param {ScanUsageOptions} opts - Scan configuration options
 * @param {string} [opts.envPath] - Path to .env file for comparison
 * @param {string} [opts.examplePath] - Path to .env.example file for comparison
 * @param {boolean} opts.json - Output as JSON instead of console
 * @param {boolean} opts.showUnused - Show unused variables from .env
 * @param {boolean} opts.showStats - Show detailed statistics
 * @param {boolean} [opts.isCiMode] - Run in CI mode (exit with error code)
 * @param {boolean} [opts.allowDuplicates] - Allow duplicate keys without warning
 * @returns {Promise<{exitWithError: boolean}>} Returns true if missing variables found
 */
export async function scanUsage(
  opts: ScanUsageOptions,
): Promise<{ exitWithError: boolean }> {
  if (!opts.json) {
    console.log();
    console.log(
      chalk.blue('🔍 Scanning codebase for environment variable usage...'),
    );
    console.log();
  }

  // Scan the codebase
  let scanResult = await scanCodebase(opts);

  scanResult.used = scanResult.used.filter(
    (u: EnvUsage) => u.context && !/^\s*(\/\/|#)/.test(u.context.trim()),
  );

  // Recalculate stats after filtering out commented usages
  const uniqueVariables = new Set(scanResult.used.map((u) => u.variable)).size;
  scanResult.stats = {
    filesScanned: scanResult.stats.filesScanned, // Keep original files scanned count
    totalUsages: scanResult.used.length,
    uniqueVariables: uniqueVariables,
  };

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
  let duplicatesFound = false;
  let dupsEnv: Array<{ key: string; count: number }> = [];
  let dupsExample: Array<{ key: string; count: number }> = [];

  // Store fix information for consolidated display
  let fixApplied = false;
  let fixedKeys: string[] = [];
  let removedDuplicates: string[] = [];

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

      // Check for duplicates in the env file
      if (!opts.allowDuplicates) {
        dupsEnv = findDuplicateKeys(compareFile.path).filter(
          ({ key }) =>
            !opts.ignore.includes(key) &&
            !opts.ignoreRegex.some((rx) => rx.test(key)),
        );

        // Also check for duplicates in example file if it exists AND is different from compareFile
        if (opts.examplePath) {
          const examplePath = resolveFromCwd(opts.cwd, opts.examplePath);
          // Only check example file if it exists and is NOT the same as the comparison file
          if (fs.existsSync(examplePath) && examplePath !== compareFile.path) {
            dupsExample = findDuplicateKeys(examplePath).filter(
              ({ key }) =>
                !opts.ignore.includes(key) &&
                !opts.ignoreRegex.some((rx) => rx.test(key)),
            );
          }
        }

        duplicatesFound = dupsEnv.length > 0 || dupsExample.length > 0;

        // Apply duplicate fixes if --fix is enabled (but don't show message yet)
        if (opts.fix && (dupsEnv.length > 0 || dupsExample.length > 0)) {
          const { changed, result } = applyFixes({
            envPath: compareFile.path,
            examplePath: opts.examplePath
              ? resolveFromCwd(opts.cwd, opts.examplePath)
              : '',
            missingKeys: [],
            duplicateKeys: dupsEnv.map((d) => d.key),
          });

          if (changed) {
            fixApplied = true;
            removedDuplicates = result.removedDuplicates;
            // Clear duplicates after fix
            duplicatesFound = false;
            dupsEnv = [];
            dupsExample = [];
          }
        }

        // Add to scan result for both JSON and console output (only if not fixed)
        if (
          (dupsEnv.length > 0 || dupsExample.length > 0) &&
          (!opts.fix || !fixApplied)
        ) {
          if (!scanResult.duplicates) scanResult.duplicates = {};
          if (dupsEnv.length > 0) scanResult.duplicates.env = dupsEnv;
          if (dupsExample.length > 0)
            scanResult.duplicates.example = dupsExample;
        }
      }
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

  // Apply missing keys fix if --fix is enabled (but don't show message yet)
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
    return {
      exitWithError:
        scanResult.missing.length > 0 ||
        duplicatesFound ||
        !!(
          opts.strict &&
          (scanResult.unused.length > 0 ||
            (scanResult.duplicates?.env?.length ?? 0) > 0 ||
            (scanResult.duplicates?.example?.length ?? 0) > 0 ||
            (scanResult.secrets?.length ?? 0) > 0)
        ),
    };
  }

  // Console output
  const result = outputToConsole(scanResult, opts, comparedAgainst);

  // Show consolidated fix message at the bottom (after all other output)
  if (opts.fix && !opts.json) {
    if (fixApplied) {
      console.log(chalk.green('✅ Auto-fix applied:'));

      // Show removed duplicates
      if (removedDuplicates.length > 0) {
        console.log(
          chalk.green(
            `   - Removed ${removedDuplicates.length} duplicate keys from ${comparedAgainst}: ${removedDuplicates.join(', ')}`,
          ),
        );
      }

      // Show added missing keys
      if (fixedKeys.length > 0) {
        console.log(
          chalk.green(
            `   - Added ${fixedKeys.length} missing keys to ${comparedAgainst}: ${fixedKeys.join(', ')}`,
          ),
        );

        if (opts.examplePath) {
          console.log(
            chalk.green(
              `   - Synced ${fixedKeys.length} keys to ${path.basename(opts.examplePath)}`,
            ),
          );
        }
      }

      console.log();
    } else {
      console.log(chalk.green('✅ Auto-fix applied: no changes needed.'));
      console.log();
    }
  }

  if (!opts.json && !opts.fix) {
    if (scanResult.missing.length > 0 && duplicatesFound) {
      console.log(
        chalk.gray(
          '💡 Tip: Run with `--fix` to add missing keys and remove duplicates',
        ),
      );
      console.log();
    } else if (scanResult.missing.length > 0) {
      console.log(chalk.gray('💡 Tip: Run with `--fix` to add missing keys'));
      console.log();
    } else if (duplicatesFound) {
      console.log(
        chalk.gray('💡 Tip: Run with `--fix` to remove duplicate keys'),
      );
      console.log();
    }
  }

  return {
    exitWithError:
      result.exitWithError ||
      duplicatesFound ||
      !!(
        opts.strict &&
        (scanResult.unused.length > 0 ||
          (scanResult.duplicates?.env?.length ?? 0) > 0 ||
          (scanResult.duplicates?.example?.length ?? 0) > 0 ||
          (scanResult.secrets?.length ?? 0) > 0)
      ),
  };
}
