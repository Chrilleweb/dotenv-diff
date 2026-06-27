import fs from 'fs';
import path from 'path';
import { DEFAULT_ENV_FILE } from '../config/constants.js';

/**
 * Matches `.env` itself or any `.env.*` variant (e.g. `.env.local`,
 * `.env.example`), but not unrelated dotfiles like `.envrc`.
 */
const ENV_FILE_PATTERN = /^\.env(\.|$)/;

/**
 * Discovers every `.env*` file in a directory for matrix comparison.
 *
 * Unlike `discoverEnvFiles`, this intentionally includes `.env.example*`
 * variants, since matrix mode treats every file as an equal column rather
 * than pairing an env file with a reference example file.
 *
 * @param cwd - The directory to search.
 * @returns File names matching `.env*`, sorted with `.env` first, then alphabetically.
 */
export function discoverMatrixFiles(cwd: string): string[] {
  return fs
    .readdirSync(cwd)
    .filter((name) => ENV_FILE_PATTERN.test(name) && isRegularFile(cwd, name))
    .sort((a, b) => {
      if (a === DEFAULT_ENV_FILE) return -1;
      if (b === DEFAULT_ENV_FILE) return 1;
      return a.localeCompare(b);
    });
}

/**
 * Checks whether a path is a regular file (not a directory or symlink to one).
 * @param cwd - The directory containing the entry.
 * @param name - The file name to check.
 * @returns True if the path exists and is a regular file.
 */
function isRegularFile(cwd: string, name: string): boolean {
  try {
    return fs.statSync(path.resolve(cwd, name)).isFile();
  } catch {
    return false;
  }
}
