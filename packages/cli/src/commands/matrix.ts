import fs from 'fs';
import path from 'path';
import { parseEnvFile } from '../services/parseEnvFile.js';
import { filterIgnoredKeys } from '../core/helpers/filterIgnoredKeys.js';
import { diffMatrix } from '../core/diffMatrix.js';
import { discoverMatrixFiles } from '../services/matrixDiscovery.js';
import { printMatrixHeader } from '../ui/matrix/printMatrixHeader.js';
import { printMatrixTable } from '../ui/matrix/printMatrixTable.js';
import {
  printMatrixInsufficientFiles,
  printMatrixMissingFiles,
} from '../ui/matrix/printMatrixErrors.js';
import type {
  ExitResult,
  MatrixFileInput,
  MatrixRunOptions,
} from '../config/types.js';

/** Resolved file ready to be parsed: its display name and absolute path. */
interface ResolvedFile {
  name: string;
  path: string;
}

/**
 * Runs matrix comparison across 2+ env files, auto-discovering every
 * `.env*` file in the cwd when no explicit files are given.
 * @param opts Matrix run options.
 * @returns Whether the process should exit with an error.
 */
export async function runMatrix(opts: MatrixRunOptions): Promise<ExitResult> {
  const fileNames =
    opts.files.length > 0 ? opts.files : discoverMatrixFiles(opts.cwd);

  const { found, missing } = resolveMatrixFiles(opts.cwd, fileNames);

  if (missing.length) {
    if (opts.json) {
      printJson({ error: 'files-not-found', missing });
    } else {
      printMatrixMissingFiles(missing);
    }
    return { exitWithError: true };
  }

  if (found.length < 2) {
    if (opts.json) {
      printJson({ error: 'insufficient-files', found: found.length });
    } else {
      printMatrixInsufficientFiles(found.length);
    }
    return { exitWithError: true };
  }

  const files = found.map((file) => parseMatrixFile(file, opts));
  const result = diffMatrix(files, opts.checkValues);

  if (opts.json) {
    printJson(result);
    return { exitWithError: !result.allMatch };
  }

  printMatrixHeader(result.files);
  printMatrixTable(result, opts.checkValues, opts.showStats);

  return { exitWithError: !result.allMatch };
}

/**
 * Resolves file names to absolute paths and splits them into found/missing.
 * @param cwd Current working directory.
 * @param fileNames File names to resolve.
 * @returns Found files (name + absolute path) and the names that don't exist.
 */
function resolveMatrixFiles(
  cwd: string,
  fileNames: string[],
): { found: ResolvedFile[]; missing: string[] } {
  const found: ResolvedFile[] = [];
  const missing: string[] = [];

  for (const name of fileNames) {
    const absPath = path.resolve(cwd, name);
    if (fs.existsSync(absPath)) {
      found.push({ name, path: absPath });
    } else {
      missing.push(name);
    }
  }

  return { found, missing };
}

/**
 * Parses a single file and filters out ignored keys.
 * @param file The resolved file to parse.
 * @param opts Matrix run options carrying the ignore lists.
 * @returns A `MatrixFileInput` ready to be passed to `diffMatrix`.
 */
function parseMatrixFile(
  file: ResolvedFile,
  opts: Pick<MatrixRunOptions, 'ignore' | 'ignoreRegex'>,
): MatrixFileInput {
  const parsed = parseEnvFile(file.path);
  const keys = filterIgnoredKeys(
    Object.keys(parsed),
    opts.ignore,
    opts.ignoreRegex,
  );

  return {
    name: file.name,
    values: Object.fromEntries(keys.map((k) => [k, parsed[k]!])),
  };
}

/**
 * Prints a value as pretty-printed JSON.
 * @param data The data to print.
 * @returns void
 */
function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
