import fs from 'fs';
import { parseEnvFile } from '../core/parseEnv.js';
import { filterIgnoredKeys } from '../core/filterIgnoredKeys.js';
import { compareWithEnvFiles } from '../core/scan/compareScan.js';
import { findDuplicateKeys } from '../core/duplicates.js';
import { applyFixes } from '../core/fixEnv.js';
import { toUpperSnakeCase } from '../core/helpers/toUpperSnakeCase.js';
import { resolveFromCwd } from '../core/helpers/resolveFromCwd.js';
import { detectEnvExpirations } from './detectEnvExpirations.js';
import { detectInconsistentNaming } from '../core/detectInconsistentNaming.js';
import type {
  ScanUsageOptions,
  ScanResult,
  DuplicateResult,
  UppercaseWarning,
  Duplicate,
} from '../config/types.js';

interface ProcessComparisonResult {
  scanResult: ScanResult;
  envVariables: Record<string, string | undefined>;
  comparedAgainst: string;
  duplicatesFound: boolean;
  dupsEnv: Duplicate[];
  dupsEx: Duplicate[];
  fixApplied: boolean;
  removedDuplicates: string[];
  addedEnv: string[];
  addedExample: string[];
  gitignoreUpdated: boolean;
  exampleFull?: Record<string, string> | undefined;
  uppercaseWarnings?: UppercaseWarning[];
  expireWarnings?: Array<{ key: string; date: string; daysLeft: number }>;
  inconsistentNamingWarnings?: Array<{
    key1: string;
    key2: string;
    suggestion: string;
  }>;
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
  let dupsEnv: Duplicate[] = [];
  let dupsEx: Duplicate[] = [];
  let fixApplied = false;
  let removedDuplicates: string[] = [];
  let addedEnv: string[] = [];
  let addedExample: string[] = [];
  let gitignoreUpdated = false;
  let exampleFull: Record<string, string> | undefined = undefined;
  let uppercaseWarnings: UppercaseWarning[] = [];
  let expireWarnings: Array<{ key: string; date: string; daysLeft: number }> =
    [];
  let inconsistentNamingWarnings: Array<{
    key1: string;
    key2: string;
    suggestion: string;
  }> = [];

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

    // Detect uppercase keys
    if (opts.uppercaseKeys) {
      for (const key of envKeys) {
        if (!/^[A-Z0-9_]+$/.test(key)) {
          uppercaseWarnings.push({ key, suggestion: toUpperSnakeCase(key) });
        }
      }
    }

    // Find duplicates
    if (!opts.allowDuplicates) {
      const duplicateResults = checkDuplicates(compareFile, opts);
      dupsEnv = duplicateResults.dupsEnv;
      dupsEx = duplicateResults.dupsEx;
      duplicatesFound = dupsEnv.length > 0 || dupsEx.length > 0;
    }

    if (opts.expireWarnings) {
      expireWarnings = detectEnvExpirations(compareFile.path);
    }

    // Check for inconsistent naming across env + example keys
    if (opts.inconsistentNamingWarnings) {
      const envKeysList = Object.keys(envFull);
      const exampleKeysList = exampleFull ? Object.keys(exampleFull) : [];

      // Combine all keys for naming analysis
      const allKeys = [...envKeysList, ...exampleKeysList];

      inconsistentNamingWarnings = detectInconsistentNaming(allKeys);
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
        dupsEx = [];
        duplicatesFound = false;
      }
    }

    // Keep duplicates for output if not fixed
    if (duplicatesFound && (!opts.fix || !fixApplied)) {
      if (!scanResult.duplicates) scanResult.duplicates = {};
      if (dupsEnv.length > 0) scanResult.duplicates.env = dupsEnv;
      if (dupsEx.length > 0) scanResult.duplicates.example = dupsEx;
    }
  } catch (error) {
    const errorMessage = `Could not read ${compareFile.name}: ${compareFile.path} - ${error}`;
    return {
      scanResult,
      envVariables,
      comparedAgainst,
      duplicatesFound,
      dupsEnv,
      dupsEx,
      fixApplied,
      removedDuplicates,
      addedEnv,
      addedExample,
      gitignoreUpdated,
      exampleFull,
      uppercaseWarnings,
      expireWarnings,
      inconsistentNamingWarnings,
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
    dupsEx,
    fixApplied,
    removedDuplicates,
    addedEnv,
    addedExample,
    gitignoreUpdated,
    exampleFull,
    uppercaseWarnings,
    expireWarnings,
    inconsistentNamingWarnings,
  };
}

/**
 * Check for duplicate keys in env and example files
 * @param compareFile - The file to compare against
 * @param opts - Scan options
 * @returns Object containing duplicate keys in env and example files
 */
function checkDuplicates(
  compareFile: { path: string; name: string },
  opts: ScanUsageOptions,
): DuplicateResult {
  const isIgnored = (key: string) =>
    !opts.ignore.includes(key) && !opts.ignoreRegex.some((rx) => rx.test(key));

  // Duplicates in main env file
  const dupsEnv = findDuplicateKeys(compareFile.path).filter(({ key }) =>
    isIgnored(key),
  );

  // Duplicates in example file
  let dupsEx: Duplicate[] = [];

  if (opts.examplePath) {
    const examplePath = resolveFromCwd(opts.cwd, opts.examplePath);

    const exampleIsDifferentFile =
      fs.existsSync(examplePath) && examplePath !== compareFile.path;

    if (exampleIsDifferentFile) {
      dupsEx = findDuplicateKeys(examplePath).filter(({ key }) =>
        isIgnored(key),
      );
    }
  }

  return { dupsEnv, dupsEx } satisfies DuplicateResult;
}
