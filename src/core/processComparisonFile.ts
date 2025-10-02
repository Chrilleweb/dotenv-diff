import fs from 'fs';
import { parseEnvFile } from './parseEnv.js';
import { filterIgnoredKeys } from './filterIgnoredKeys.js';
import { compareWithEnvFiles } from './compareScan.js';
import { findDuplicateKeys } from '../services/duplicates.js';
import { applyFixes } from './fixEnv.js';
import { resolveFromCwd } from './helpers/resolveFromCwd.js';
import type { ScanUsageOptions, ScanResult } from '../config/types.js';

export interface ProcessComparisonResult {
  scanResult: ScanResult;
  envVariables: Record<string, string | undefined>;
  comparedAgainst: string;
  duplicatesFound: boolean;
  dupsEnv: Array<{ key: string; count: number }>;
  dupsExample: Array<{ key: string; count: number }>;
  fixApplied: boolean;
  removedDuplicates: string[];
  gitignoreUpdated: boolean;
  error?: { message: string; shouldExit: boolean };
}

/**
 * Process comparison file: parse env, check duplicates, apply fixes
 * @param scanResult - Current scan result
 * @param compareFile - File to compare against
 * @param opts - Scan options
 * @returns Processed comparison result
 */
export function processComparisonFile(
  scanResult: ScanResult,
  compareFile: { path: string; name: string },
  opts: ScanUsageOptions,
): ProcessComparisonResult {
  let envVariables: Record<string, string | undefined> = {};
  let comparedAgainst = '';
  let duplicatesFound = false;
  let dupsEnv: Array<{ key: string; count: number }> = [];
  let dupsExample: Array<{ key: string; count: number }> = [];
  let fixApplied = false;
  let removedDuplicates: string[] = [];
  let gitignoreUpdated = false;

  try {
    // Parse and filter env file
    const envFull = parseEnvFile(compareFile.path);
    const envKeys = filterIgnoredKeys(
      Object.keys(envFull),
      opts.ignore,
      opts.ignoreRegex,
    );
    envVariables = Object.fromEntries(envKeys.map((k) => [k, envFull[k]]));
    scanResult = compareWithEnvFiles(scanResult, envVariables);
    comparedAgainst = compareFile.name;

    // Check for duplicates if not allowed
    if (!opts.allowDuplicates) {
      const duplicateResults = checkDuplicates(compareFile, opts);
      dupsEnv = duplicateResults.dupsEnv;
      dupsExample = duplicateResults.dupsExample;
      duplicatesFound = dupsEnv.length > 0 || dupsExample.length > 0;

      // Apply duplicate fixes if --fix is enabled
      if (opts.fix && duplicatesFound) {
        const fixResult = applyDuplicateFixes(compareFile, dupsEnv, opts);
        if (fixResult.changed) {
          fixApplied = true;
          removedDuplicates = fixResult.result.removedDuplicates;
          gitignoreUpdated = fixResult.result.gitignoreUpdated;
          duplicatesFound = false;
          dupsEnv = [];
          dupsExample = [];
        }
      }

      // Keep duplicates for output if not fixed
      if (duplicatesFound && (!opts.fix || !fixApplied)) {
        if (!scanResult.duplicates) scanResult.duplicates = {};
        if (dupsEnv.length > 0) scanResult.duplicates.env = dupsEnv;
        if (dupsExample.length > 0) scanResult.duplicates.example = dupsExample;
      }
    }
  } catch (error) {
    const errorMessage = `Could not read ${compareFile.name}: ${compareFile.path} - ${error}`;
    return {
      scanResult,
      envVariables,
      comparedAgainst,
      duplicatesFound,
      dupsEnv,
      dupsExample,
      fixApplied,
      removedDuplicates,
      gitignoreUpdated,
      error: {
        message: errorMessage,
        shouldExit: opts.isCiMode ?? false,
      },
    };
  }

  return {
    scanResult,
    envVariables,
    comparedAgainst,
    duplicatesFound,
    dupsEnv,
    dupsExample,
    fixApplied,
    removedDuplicates,
    gitignoreUpdated,
  };
}

/**
 * Check for duplicate keys in env and example files
 */
function checkDuplicates(
  compareFile: { path: string; name: string },
  opts: ScanUsageOptions,
): {
  dupsEnv: Array<{ key: string; count: number }>;
  dupsExample: Array<{ key: string; count: number }>;
} {
  const dupsEnv = findDuplicateKeys(compareFile.path).filter(
    ({ key }) =>
      !opts.ignore.includes(key) &&
      !opts.ignoreRegex.some((rx) => rx.test(key)),
  );

  let dupsExample: Array<{ key: string; count: number }> = [];

  if (opts.examplePath) {
    const examplePath = resolveFromCwd(opts.cwd, opts.examplePath);
    // Only check example file if it exists and is NOT the same as comparison file
    if (fs.existsSync(examplePath) && examplePath !== compareFile.path) {
      dupsExample = findDuplicateKeys(examplePath).filter(
        ({ key }) =>
          !opts.ignore.includes(key) &&
          !opts.ignoreRegex.some((rx) => rx.test(key)),
      );
    }
  }

  return { dupsEnv, dupsExample };
}

/**
 * Apply fixes for duplicate keys
 */
function applyDuplicateFixes(
  compareFile: { path: string; name: string },
  dupsEnv: Array<{ key: string; count: number }>,
  opts: ScanUsageOptions,
) {
  return applyFixes({
    envPath: compareFile.path,
    examplePath: opts.examplePath
      ? resolveFromCwd(opts.cwd, opts.examplePath)
      : '',
    missingKeys: [],
    duplicateKeys: dupsEnv.map((d) => d.key),
    ensureGitignore: true,
  });
}