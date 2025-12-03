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
  addedEnv: string[];
  addedExample: string[];
  gitignoreUpdated: boolean;
  exampleFull?: Record<string, string> | undefined;
  error?: { message: string; shouldExit: boolean };
}

/**
 * Process comparison file: parse env, check duplicates, check missing keys, apply fixes
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
  let addedEnv: string[] = [];
  let addedExample: string[] = [];
  let gitignoreUpdated = false;
  let exampleFull: Record<string, string> | undefined = undefined;

  try {
    // Load .env.example (if exists)
    if (opts.examplePath) {
      const examplePath = resolveFromCwd(opts.cwd, opts.examplePath);
      if (fs.existsSync(examplePath)) {
        exampleFull = parseEnvFile(examplePath);
      }
    }

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

    // Find duplicates
    if (!opts.allowDuplicates) {
      const duplicateResults = checkDuplicates(compareFile, opts);
      dupsEnv = duplicateResults.dupsEnv;
      dupsExample = duplicateResults.dupsExample;
      duplicatesFound = dupsEnv.length > 0 || dupsExample.length > 0;
    }

    // Apply fixes (both duplicates + missing keys + gitignore)
    if (
      opts.fix &&
      (duplicatesFound || scanResult.missing.length > 0 || true)
    ) {
      const { changed, result } = applyFixes({
        envPath: compareFile.path,
        examplePath: opts.examplePath
          ? resolveFromCwd(opts.cwd, opts.examplePath)
          : '',
        missingKeys: scanResult.missing,
        duplicateKeys: dupsEnv.map((d) => d.key),
        ensureGitignore: true,
      });

      if (changed) {
        fixApplied = true;
        removedDuplicates = result.removedDuplicates;
        addedEnv = result.addedEnv;
        addedExample = result.addedExample;
        gitignoreUpdated = result.gitignoreUpdated;

        scanResult.missing = [];
        dupsEnv = [];
        dupsExample = [];
        duplicatesFound = false;
      }
    }

    // Keep duplicates for output if not fixed
    if (duplicatesFound && (!opts.fix || !fixApplied)) {
      if (!scanResult.duplicates) scanResult.duplicates = {};
      if (dupsEnv.length > 0) scanResult.duplicates.env = dupsEnv;
      if (dupsExample.length > 0) scanResult.duplicates.example = dupsExample;
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
      addedEnv,
      addedExample,
      gitignoreUpdated,
      exampleFull,
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
    addedEnv,
    addedExample,
    gitignoreUpdated,
    exampleFull,
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
