import fs from 'fs';
import path from 'path';
import { scanCodebase } from '../services/scanCodebase.js';
import { parseEnvFile } from '../services/parseEnvFile.js';
import { findDuplicateKeys } from '../core/duplicates.js';
import type { ScanOptions } from '../config/types.js';
import { DEFAULT_ENV_FILE, DEFAULT_EXAMPLE_FILE } from '../config/constants.js';
import { printExplain, type ExplainResult } from '../ui/scan/printExplain.js';
import { skipCommentedUsages } from '../core/helpers/skipCommentedUsages.js';

/**
 * Options forwarded from the CLI for the --explain command.
 */
export interface ExplainOptions extends ScanOptions {
  key: string;
}

/**
 * Implements `dotenv-diff --explain <KEY>`.
 *
 * Reports where the key is defined in env files, where it is used in the
 * codebase, and its overall status (defined / used / duplicated / ignored).
 * @param opts Explain options from CLI
 * @returns void
 */
export async function explainKey(opts: ExplainOptions): Promise<void> {
  const { key, cwd, ignore, ignoreRegex } = opts;

  // Find env files that contain the key
  const envFiles = discoverEnvFilesSync(cwd);
  const definedIn: string[] = [];
  const isDuplicated = envFiles.some((filePath) => {
    const dups = findDuplicateKeys(filePath);
    return dups.some((d) => d.key === key);
  });

  for (const filePath of envFiles) {
    const parsed = parseEnvFile(filePath);
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      definedIn.push(path.relative(cwd, filePath));
    }
  }

  // Scan codebase for usages
  const scanResult = await scanCodebase(opts);

  // Filter out commented usages
  const filteredUsages = skipCommentedUsages(scanResult.used);
  const usages = filteredUsages.filter((u) => u.variable === key);

  // Check ignore status
  const isIgnored =
    ignore.includes(key) || ignoreRegex.some((rx) => rx.test(key));

  // Print result
  const result: ExplainResult = {
    key,
    definedIn,
    usages,
    isDuplicated,
    isIgnored,
  };

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printExplain(result);
  }
}

/**
 * Returns absolute paths to all .env* files in the cwd
 * (both env files and example files).
 * @param cwd Directory to search in
 * @returns Array of absolute file paths
 */
function discoverEnvFilesSync(cwd: string): string[] {
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(cwd);
  } catch {
    return [];
  }

  return entries
    .filter(
      (f) =>
        f.startsWith(DEFAULT_ENV_FILE) || f.startsWith(DEFAULT_EXAMPLE_FILE),
    )
    .map((f) => path.resolve(cwd, f));
}
