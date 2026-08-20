import fs from 'fs';
import path from 'path';
import type { DriftWarning } from '../config/types.js';
import { parseEnvFile } from './parseEnvFile.js';
import { detectOptionalKeys } from './detectOptionalKeys.js';
import { resolveExampleFile } from './resolveExampleFile.js';
import { filterIgnoredKeys } from '../core/helpers/filterIgnoredKeys.js';
import { isExampleFile } from '../core/helpers/isExampleFile.js';
import { compareCodePoint } from '../core/helpers/compareCodePoint.js';
import { DEFAULT_ENV_FILE } from '../config/constants.js';

/**
 * Arguments for {@link detectExampleDrift}.
 */
interface DetectExampleDriftArgs {
  /** Absolute path of the file the scan compared against. */
  comparisonPath: string;
  /** Keys to ignore, from `--ignore`. */
  ignore: string[];
  /** Regex patterns of keys to ignore, from `--ignore-regex`. */
  ignoreRegex: RegExp[];
}

/**
 * Detects keys that are set in an env file but missing from the example file
 * that documents it.
 *
 * A scan compares code usage against a single file, so the example file is never
 * held up against the values a developer actually runs with: a key added to
 * `.env` and forgotten in `.env.example` goes unnoticed until a new contributor
 * clones the repo and cannot start the app. This closes that gap.
 *
 * Exactly one env file is checked: the one the scan compared against, so the
 * report always concerns the file the run is about. The exception is a scan that
 * compared against an example file — with no `.env` present, discovery falls
 * through to `.env.example` itself — where the env file beside it is used
 * instead, so `.env.local` is still checked rather than silently skipped.
 *
 * The check is one-directional on purpose: only keys present in an env file but
 * absent from its example are reported. The reverse (documented but not set
 * locally) is already what `--compare` is for, and is expected during normal
 * development.
 *
 * Keys marked `@optional` in the env file are skipped: the annotation already
 * says the key is not required, so demanding it be documented would contradict
 * it. The annotation needs no handling on the example side — a key written there
 * is documented by definition, whatever its annotations.
 *
 * Files are paired by the same suffix convention as `--compare`: `.env.local`
 * prefers `.env.example.local` and falls back to `.env.example`. Any accepted
 * example name works, so `.env.local` against `.env.sample` pairs up too.
 * @param args - The file the scan compared against and the ignore config.
 * @returns One warning per undocumented key, in the order they appear in the env file.
 */
export function detectExampleDrift({
  comparisonPath,
  ignore,
  ignoreRegex,
}: DetectExampleDriftArgs): DriftWarning[] {
  const dir = path.dirname(comparisonPath);

  const envFile = resolveEnvFile(dir, path.basename(comparisonPath));
  if (!envFile) return [];

  const envPath = path.join(dir, envFile);
  const examplePath = resolveExampleFile(envPath);
  if (!examplePath) return [];

  const optionalKeys = new Set(detectOptionalKeys(envPath));
  const envKeys = filterIgnoredKeys(
    Object.keys(parseEnvFile(envPath)),
    ignore,
    ignoreRegex,
  );
  const exampleKeys = new Set(Object.keys(parseEnvFile(examplePath)));
  const exampleFile = path.basename(examplePath);

  return envKeys
    .filter((key) => !exampleKeys.has(key) && !optionalKeys.has(key))
    .map((key) => ({ key, envFile, exampleFile }));
}

/**
 * Picks the env file to check drift for.
 *
 * Normally that is the file the scan compared against. When the scan compared
 * against an example file instead — discovery falls through to `.env.example`
 * when no `.env` exists — the first env file beside it is used, so a project
 * running on `.env.local` alone is still checked.
 * @param dir - The directory the comparison file lives in.
 * @param comparisonFile - Basename of the file the scan compared against.
 * @returns The env file basename, or null when the directory holds none.
 */
function resolveEnvFile(dir: string, comparisonFile: string): string | null {
  if (!isExampleFile(comparisonFile, { withSuffix: true })) {
    return comparisonFile;
  }

  return findEnvFile(dir);
}

/**
 * Finds the env file in a directory that holds real values, preferring `.env`
 * and otherwise taking the first by code point so the choice is deterministic.
 *
 * A separator is required after `.env`, so `.env` and `.env.local` count while
 * `.envrc` (direnv) does not — that is a shell script, and reporting every line
 * of it as an undocumented key would be noise.
 * @param dir - The directory to read.
 * @returns The env file basename, or null when the directory holds none.
 */
function findEnvFile(dir: string): string | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }

  const envFiles = entries.filter(
    (name) => isEnvFileName(name) && !isExampleFile(name, { withSuffix: true }),
  );

  if (envFiles.includes(DEFAULT_ENV_FILE)) return DEFAULT_ENV_FILE;

  return envFiles.sort(compareCodePoint)[0] ?? null;
}

/**
 * Reports whether a filename is a dotenv file: `.env` itself, or `.env`
 * followed by a separator and an environment name.
 * @param name - The file basename.
 * @returns True for `.env`, `.env.local`, `.env-local`; false for `.envrc`.
 */
function isEnvFileName(name: string): boolean {
  return (
    name === DEFAULT_ENV_FILE ||
    name.startsWith(`${DEFAULT_ENV_FILE}.`) ||
    name.startsWith(`${DEFAULT_ENV_FILE}-`)
  );
}
