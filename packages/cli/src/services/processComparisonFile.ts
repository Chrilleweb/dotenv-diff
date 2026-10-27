import fs from 'fs';
import path from 'path';
import { parseEnvFile } from './parseEnvFile.js';
import { filterIgnoredKeys } from '../core/helpers/filterIgnoredKeys.js';
import { compareWithEnvFiles } from '../core/scan/compareScan.js';
import { excludeOptionalKeys } from '../core/scan/excludeOptionalKeys.js';
import { discoverExampleScopes } from './exampleDiscovery.js';
import { findDuplicateKeys } from './duplicates.js';
import { applyFixes } from './fixEnv.js';
import { detectUppercaseKeys } from '../core/detectUppercaseKeys.js';
import { resolveFromCwd } from '../core/helpers/resolveFromCwd.js';
import { detectEnvExpirations } from './detectEnvExpirations.js';
import { detectInconsistentNaming } from '../core/detectInconsistentNaming.js';
import { detectMissingComments } from './detectMissingComments.js';
import { detectOptionalKeys } from './detectOptionalKeys.js';
import { detectExampleDrift } from './detectExampleDrift.js';
import { resolveExampleFile } from './resolveExampleFile.js';
import { detectSecretsInExample } from '../core/security/exampleSecretDetector.js';
import type {
  ScanUsageOptions,
  ScanResult,
  DuplicateResult,
  Duplicate,
  ComparisonFile,
  FixContext,
} from '../config/types.js';

/**
 * Result of processing comparison file
 */
export interface ProcessComparisonResult {
  /** The scan result after processing the comparison file */
  scanResult: ScanResult;
  /** The context of any fixes applied to the comparison file */
  fix: FixContext;
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
  let error: ProcessComparisonResult['error'];

  let fix: FixContext = {
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

    const exampleFull =
      exampleFilePath && fs.existsSync(exampleFilePath)
        ? parseEnvFile(exampleFilePath)
        : undefined;

    // Parse and filter env file
    const envFull = parseEnvFile(compareFile.path);
    const envKeys = filterIgnoredKeys(
      Object.keys(envFull),
      opts.ignore,
      opts.ignoreRegex,
    );
    const envVariables = Object.fromEntries(
      envKeys.map((k) => [k, envFull[k]]),
    );

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

    // Keys marked `@optional` in the example file are not reported as missing
    const optionalKeys = new Set(
      exampleFilePath ? detectOptionalKeys(exampleFilePath) : [],
    );
    scanResult = excludeOptionalKeys(scanResult, optionalKeys);

    // Scan the example for secrets even when it is not the comparison file —
    // an example committed with a real secret is dangerous either way.
    if (exampleFilePath && exampleFull) {
      scanResult.exampleFile = path.basename(exampleFilePath);
      scanResult.exampleWarnings = detectSecretsInExample(
        exampleFull,
        scanResult.exampleFile,
      );
    }

    // Detect uppercase keys
    scanResult.uppercaseWarnings = opts.uppercaseKeys
      ? detectUppercaseKeys(envKeys)
      : [];

    // Find duplicates
    let { dupsEnv, dupsEx }: DuplicateResult = opts.allowDuplicates
      ? { dupsEnv: [], dupsEx: [] }
      : checkDuplicates(compareFile, exampleFilePath, opts);

    scanResult.expireWarnings = opts.expireWarnings
      ? detectEnvExpirations(compareFile.path)
      : [];

    // Check for inconsistent naming across env + example keys
    scanResult.inconsistentNamingWarnings = opts.inconsistentNamingWarnings
      ? detectInconsistentNaming([
          ...Object.keys(envFull),
          ...Object.keys(exampleFull ?? {}),
        ])
      : [];

    // Warn about .env.example keys without a documenting comment. Runs on the
    // example file (documentation lives there), not the env file — the same
    // example the other checks read.
    scanResult.commentWarnings =
      opts.commentWarnings && exampleFilePath && exampleFull
        ? detectMissingComments(exampleFilePath)
        : [];

    // Warn when the env file this run is about has drifted from the example
    // documenting it. The scan only ever reads one file, so without this the
    // example is never checked against the values actually in use.
    scanResult.driftWarnings = opts.driftWarnings
      ? detectExampleDrift({
          comparisonPath: compareFile.path,
          ignore: opts.ignore,
          ignoreRegex: opts.ignoreRegex,
        })
      : [];

    // Apply fixes (both duplicates + missing keys + gitignore)
    if (opts.fix) {
      const { changed, result } = applyFixes({
        envPath: compareFile.path,
        missingKeys: scanResult.missing,
        duplicateKeys: dupsEnv.map((d) => d.key),
        ensureGitignore: true,
      });

      fix = { ...result, fixApplied: changed };

      if (changed) {
        // clear the issues that were fixed. `dupsEx` is not among them: the fix
        // only rewrites the env file, so duplicates in the example file survive
        // it and must still be reported.
        scanResult.missing = [];
        dupsEnv = [];
      }
    }

    // Keep the duplicates that were not fixed for output
    if (dupsEnv.length > 0 || dupsEx.length > 0) {
      scanResult.duplicates = {
        ...scanResult.duplicates,
        ...(dupsEnv.length > 0 ? { env: dupsEnv } : {}),
        ...(dupsEx.length > 0 ? { example: dupsEx } : {}),
      };
    }
  } catch (err) {
    error = {
      message: `Could not read ${compareFile.name}: ${compareFile.path} - ${err}`,
      shouldExit: opts.isCiMode ?? false,
    };
  }

  return {
    scanResult,
    fix,
    ...(error ? { error } : {}),
  };
}

/**
 * Check for duplicate keys in env and example files.
 *
 * The example file is taken from the caller rather than re-derived from
 * `--example`, so it is checked whenever one exists beside the comparison file
 * — the same reasoning as the drift check. Gating it on the flag meant the
 * example was silently never checked in the common case of a plain
 * `dotenv-diff scan`, even though a duplicated key there is exactly the kind of
 * thing that misleads whoever copies the file.
 * @param compareFile - The file to compare against
 * @param examplePath - Absolute path of the example file, or null when none was found
 * @param opts - Scan options
 * @returns Object containing duplicate keys in env and example files
 */
function checkDuplicates(
  compareFile: ComparisonFile,
  examplePath: string | null,
  opts: ScanUsageOptions,
): DuplicateResult {
  const isNotIgnored = (key: string) =>
    !opts.ignore.includes(key) && !opts.ignoreRegex.some((rx) => rx.test(key));

  // Duplicates in main env file
  const dupsEnv = findDuplicateKeys(compareFile.path).filter(({ key }) =>
    isNotIgnored(key),
  );

  // Duplicates in example file. Skipped when it *is* the comparison file — a
  // scan with no `.env` falls through to `.env.example`, and its duplicates are
  // already reported as `dupsEnv`. `findDuplicateKeys` handles a path that does
  // not exist, which an explicit `--example` may still point at.
  const dupsEx: Duplicate[] =
    examplePath && examplePath !== compareFile.path
      ? findDuplicateKeys(examplePath).filter(({ key }) => isNotIgnored(key))
      : [];

  return { dupsEnv, dupsEx } satisfies DuplicateResult;
}
