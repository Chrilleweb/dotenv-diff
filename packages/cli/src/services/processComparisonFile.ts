import fs from 'fs';
import path from 'path';
import { parseEnvFile } from './parseEnvFile.js';
import { filterIgnoredKeys } from '../core/helpers/filterIgnoredKeys.js';
import { compareWithEnvFiles } from '../core/scan/compareScan.js';
import { discoverExampleScopes } from './exampleDiscovery.js';
import { findDuplicateKeys } from './duplicates.js';
import { applyFixes } from './fixEnv.js';
import { toUpperSnakeCase } from '../core/helpers/toUpperSnakeCase.js';
import { resolveFromCwd } from '../core/helpers/resolveFromCwd.js';
import { detectEnvExpirations } from './detectEnvExpirations.js';
import { detectInconsistentNaming } from '../core/detectInconsistentNaming.js';
import { detectMissingComments } from './detectMissingComments.js';
import { detectOptionalKeys } from './detectOptionalKeys.js';
import { detectExampleDrift } from './detectExampleDrift.js';
import { resolveExampleFile } from './resolveExampleFile.js';
import { DEFAULT_EXAMPLE_FILE } from '../config/constants.js';
import type {
  ScanUsageOptions,
  ScanResult,
  DuplicateResult,
  UppercaseWarning,
  Duplicate,
  ComparisonFile,
  ExpireWarning,
  InconsistentNamingWarning,
  CommentWarning,
  DriftWarning,
  FixContext,
} from '../config/types.js';

/**
 * Result of processing comparison file
 */
export interface ProcessComparisonResult {
  /** The scan result after processing the comparison file */
  scanResult: ScanResult;
  /** The environment variables from the comparison file */
  envVariables: Record<string, string | undefined>;
  /** The file the comparison was made against */
  comparedAgainst: string;
  /** The duplicate environment variables found in the comparison file */
  dupsEnv: Duplicate[];
  /** The duplicate example variables found in the comparison file */
  dupsEx: Duplicate[];
  /** The context of any fixes applied to the comparison file */
  fix: FixContext;
  /** The full contents of the example file, if it was found and read */
  exampleFull?: Record<string, string> | undefined;
  /** Basename of the example file `exampleFull` was read from. */
  exampleFile?: string | undefined;
  /** Uppercase keys found in the comparison file */
  uppercaseWarnings?: UppercaseWarning[];
  /** Expiration warnings found in the comparison file */
  expireWarnings?: ExpireWarning[];
  /** Inconsistent naming warnings found in the comparison file */
  inconsistentNamingWarnings?: InconsistentNamingWarning[];
  /** Comment warnings found in the comparison file */
  commentWarnings?: CommentWarning[];
  /** Drift warnings found in the comparison file */
  driftWarnings?: DriftWarning[];
  /** Any error encountered while processing the comparison file */
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
  compareFile: ComparisonFile,
  opts: ScanUsageOptions,
): ProcessComparisonResult {
  let envVariables: Record<string, string | undefined> = {};
  let comparedAgainst = '';
  let duplicatesFound = false;
  let dupsEnv: Duplicate[] = [];
  let dupsEx: Duplicate[] = [];
  let exampleFull: Record<string, string> | undefined = undefined;
  let exampleFile: string | undefined = undefined;
  let uppercaseWarnings: UppercaseWarning[] = [];
  let expireWarnings: ExpireWarning[] = [];
  let inconsistentNamingWarnings: InconsistentNamingWarning[] = [];
  let commentWarnings: CommentWarning[] = [];
  let driftWarnings: DriftWarning[] = [];

  const fix: FixContext = {
    fixApplied: false,
    removedDuplicates: [],
    addedEnv: [],
    gitignoreUpdated: false,
  };

  try {
    // Load the example file that documents the comparison file. Resolved from
    // the file itself rather than gated on `--example`, so the checks that read
    // it (secret detection, naming consistency) are not silently off whenever
    // the flag is omitted — which is the common case.
    const exampleFilePath = opts.examplePath
      ? resolveFromCwd(opts.cwd, opts.examplePath)
      : resolveExampleFile(compareFile.path);

    if (exampleFilePath && fs.existsSync(exampleFilePath)) {
      exampleFull = parseEnvFile(exampleFilePath);
      exampleFile = path.basename(exampleFilePath);
    }

    // Parse and filter env file
    const envFull = parseEnvFile(compareFile.path);
    const envKeys = filterIgnoredKeys(
      Object.keys(envFull),
      opts.ignore,
      opts.ignoreRegex,
    );
    envVariables = Object.fromEntries(envKeys.map((k) => [k, envFull[k]]));

    // Monorepo support: also honor `.env.example` files in subdirectories, so a
    // variable documented next to where it is used is not reported as missing.
    const scopes = discoverExampleScopes(opts.cwd, {
      exclude: opts.exclude,
      ignore: opts.ignore,
      ignoreRegex: opts.ignoreRegex,
    });
    scanResult = compareWithEnvFiles(
      scanResult,
      envVariables,
      opts.ignore,
      opts.ignoreRegex,
      scopes,
    );
    comparedAgainst = compareFile.name;

    // Keys marked `@optional` in the example file may be left out of the env
    // file entirely — that is what the annotation means — so they must not be
    // reported as missing. The typo suggestions derived from them go too.
    const optionalKeys = new Set(
      detectOptionalKeys(
        resolveFromCwd(opts.cwd, opts.examplePath ?? DEFAULT_EXAMPLE_FILE),
      ),
    );
    if (optionalKeys.size > 0) {
      scanResult.missing = scanResult.missing.filter(
        (key) => !optionalKeys.has(key),
      );
      if (scanResult.suggestions) {
        scanResult.suggestions = scanResult.suggestions.filter(
          (suggestion) => !optionalKeys.has(suggestion.key),
        );
      }
    }

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

    // Warn about .env.example keys without a documenting comment. Runs on the
    // example file (documentation lives there), not the env file — using the
    // explicit --example path when given, else the default `.env.example`.
    if (opts.commentWarnings) {
      const examplePath = resolveFromCwd(
        opts.cwd,
        opts.examplePath ?? DEFAULT_EXAMPLE_FILE,
      );
      if (fs.existsSync(examplePath)) {
        commentWarnings = detectMissingComments(examplePath);
      }
    }

    // Warn when the env file this run is about has drifted from the example
    // documenting it. The scan only ever reads one file, so without this the
    // example is never checked against the values actually in use.
    if (opts.driftWarnings) {
      driftWarnings = detectExampleDrift({
        comparisonPath: compareFile.path,
        ignore: opts.ignore,
        ignoreRegex: opts.ignoreRegex,
      });
    }

    // Apply fixes (both duplicates + missing keys + gitignore)
    if (opts.fix) {
      const { changed, result } = applyFixes({
        envPath: compareFile.path,
        missingKeys: scanResult.missing,
        duplicateKeys: dupsEnv.map((d) => d.key),
        ensureGitignore: true,
      });

      if (changed) {
        // Update state based on what was actually fixed
        fix.fixApplied = true;
        fix.removedDuplicates = result.removedDuplicates;
        fix.addedEnv = result.addedEnv;
        fix.gitignoreUpdated = result.gitignoreUpdated;

        // clear the issues that were fixed
        scanResult.missing = [];
        dupsEnv = [];
        dupsEx = [];
        duplicatesFound = false;
      }
    }

    // Keep duplicates for output if not fixed
    if (duplicatesFound && (!opts.fix || !fix.fixApplied)) {
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
      dupsEnv,
      dupsEx,
      fix,
      exampleFull,
      exampleFile,
      uppercaseWarnings,
      expireWarnings,
      inconsistentNamingWarnings,
      commentWarnings,
      driftWarnings,
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
    dupsEnv,
    dupsEx,
    fix,
    exampleFull,
    exampleFile,
    uppercaseWarnings,
    expireWarnings,
    inconsistentNamingWarnings,
    commentWarnings,
    driftWarnings,
  };
}

/**
 * Check for duplicate keys in env and example files
 * @param compareFile - The file to compare against
 * @param opts - Scan options
 * @returns Object containing duplicate keys in env and example files
 */
function checkDuplicates(
  compareFile: ComparisonFile,
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
