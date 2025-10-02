import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { parseEnvFile } from '../core/parseEnv.js';
import { scanCodebase } from '../services/codeBaseScanner.js';
import type { ScanUsageOptions, EnvUsage, Filtered, ScanResult } from '../config/types.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';
import { resolveFromCwd } from '../core/helpers/resolveFromCwd.js';
import { determineComparisonFile } from '../core/determineComparisonFile.js';
import { outputToConsole } from '../services/scanOutputToConsole.js';
import { createJsonOutput } from '../core/scanJsonOutput.js';
import { findDuplicateKeys } from '../services/duplicates.js';
import { compareWithEnvFiles } from '../core/compareScan.js';
import { applyFixes } from '../core/fixEnv.js';
import { isEnvIgnoredByGit } from '../services/git.js';
import { printFixTips } from '../ui/shared/printFixTips.js';

/**
 * Filters out commented usages from the list.
 * Skipping comments:
 *   // process.env.API_URL
 *   # process.env.API_URL
 *   /* process.env.API_URL
 *   * process.env.API_URL
 * @param usages - List of environment variable usages
 * @returns Filtered list of environment variable usages
 */
function skipCommentedUsages(usages: EnvUsage[]): EnvUsage[] {
  return usages.filter(
    (u) => u.context && !/^\s*(\/\/|#|\/\*|\*)/.test(u.context.trim()),
  );
}

/**
 * Recalculates statistics for a scan result after filtering usages.
 * @param scanResult The current scan result
 * @returns Updated scanResult with recalculated stats
 */
 function calculateStats(scanResult: ScanResult): ScanResult {
  const uniqueVariables = new Set(
    scanResult.used.map((u: EnvUsage) => u.variable),
  ).size;

  scanResult.stats = {
    filesScanned: scanResult.stats.filesScanned,
    totalUsages: scanResult.used.length,
    uniqueVariables,
  };

  return scanResult;
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
 * @param {boolean} [opts.allowDuplicates] - Allow duplicate keys without warning
 * @returns {Promise<{exitWithError: boolean}>} Returns true if missing variables found
 */
export async function scanUsage(
  opts: ScanUsageOptions,
): Promise<{ exitWithError: boolean }> {

  // Scan the codebase
  let scanResult = await scanCodebase(opts);

  // Filter out commented usages
  scanResult.used = skipCommentedUsages(scanResult.used);

  // Recalculate stats after filtering
  calculateStats(scanResult);

  // If user explicitly passed --example but the file doesn't exist:
  if (opts.examplePath) {
    const exampleAbs = resolveFromCwd(opts.cwd, opts.examplePath);
    const missing = !fs.existsSync(exampleAbs);

    if (missing) {
      const msg = `❌ Missing specified example file: ${opts.examplePath}`;
      if (opts.isCiMode) {
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
  let gitignoreUpdated = false;

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
            ensureGitignore: true,
          });

          if (changed) {
            fixApplied = true;
            removedDuplicates = result.removedDuplicates;
            gitignoreUpdated = gitignoreUpdated || result.gitignoreUpdated;
            // Clear duplicates after fix
            duplicatesFound = false;
            dupsEnv = [];
            dupsExample = [];
          }
        }

        // Keep duplicates for output if not fixed
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
        console.log(chalk.red(`❌ ${errorMessage}`));
        return { exitWithError: true };
      }
      if (!opts.json) console.log(chalk.yellow(errorMessage));
    }
  }

  // Apply missing keys fix with applyFixes (so gitignore is handled too)
  if (opts.fix && compareFile) {
    const missingKeys = scanResult.missing;
    if (missingKeys.length > 0) {
      const envFilePath = compareFile.path;
      const exampleFilePath = opts.examplePath
        ? resolveFromCwd(opts.cwd, opts.examplePath)
        : '';

      const { changed, result } = applyFixes({
        envPath: envFilePath,
        examplePath: exampleFilePath,
        missingKeys,
        duplicateKeys: [],
        ensureGitignore: true,
      });

      if (changed) {
        fixApplied = true;
        fixedKeys = result.addedEnv;
        gitignoreUpdated = gitignoreUpdated || result.gitignoreUpdated;
        scanResult.missing = [];
      }
    }
  }

  // Always run a gitignore-only fix when --fix is set (even if no missing/duplicates)
  if (opts.fix && compareFile) {
    const { result } = applyFixes({
      envPath: compareFile.path,
      examplePath: '',
      missingKeys: [],
      duplicateKeys: [],
      ensureGitignore: true,
    });
    if (result.gitignoreUpdated) {
      fixApplied = true;
      gitignoreUpdated = true;
    }
  }

  // JSON output
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

  const filtered: Filtered = {
    missing: scanResult.missing ?? [],
    duplicatesEnv: dupsEnv,
    duplicatesEx: dupsExample,
    gitignoreIssue:
      isEnvIgnoredByGit({ cwd: opts.cwd, envFile: '.env' }) === false ||
      isEnvIgnoredByGit({ cwd: opts.cwd, envFile: '.env' }) === null
        ? { reason: 'not-ignored' }
        : null,
  };

  // Console output
  const result = outputToConsole(scanResult, opts, comparedAgainst);

  // Consolidated fix message
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
      if (gitignoreUpdated) {
        console.log(chalk.green('   - Added .env ignore rules to .gitignore'));
      }
      console.log();
    } else {
      console.log(chalk.green('✅ Auto-fix applied: no changes needed.'));
      console.log();
    }
  }

  if (!opts.json && !opts.fix) {
    const ignored = isEnvIgnoredByGit({ cwd: opts.cwd, envFile: '.env' });
    const envNotIgnored = ignored === false || ignored === null;

    printFixTips(
      filtered,
      envNotIgnored,
      opts.json ?? false,
      opts.fix ?? false,
    );
  }

  return { exitWithError: result.exitWithError || duplicatesFound };
}
