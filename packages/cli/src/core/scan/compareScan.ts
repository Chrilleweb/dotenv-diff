import type { ScanResult, EnvScope } from '../../config/types.js';
import { filterIgnoredKeys } from '../helpers/filterIgnoredKeys.js';
import { suggestTypos } from '../suggestTypos.js';

/**
 * Compares the scan result with the environment variables.
 * This function identifies missing and unused environment variables.
 *
 * Missing detection is scope-aware: a used variable counts as defined when it is
 * present in the primary comparison file OR in any ancestor `.env.example` scope
 * of the file that uses it (monorepo "nearest example wins", with root inheritance).
 * @param scanResult - The result of the scan.
 * @param envVariables - The environment variables to compare against (primary file).
 * @param ignore - List of keys to ignore.
 * @param ignoreRegex - List of regex patterns to ignore.
 * @param scopes - Directory-scoped example key sets discovered in subdirectories.
 * @returns The comparison result.
 */
export function compareWithEnvFiles(
  scanResult: ScanResult,
  envVariables: Record<string, string | undefined>,
  ignore: string[] = [],
  ignoreRegex: RegExp[] = [],
  scopes: EnvScope[] = [],
): ScanResult {
  const usedVariables = new Set(scanResult.used.map((u) => u.variable));
  const envKeys = new Set(Object.keys(envVariables));

  // Files that use each variable, so a variable is only "missing" when at least one
  // of its usages is not covered by the primary file or an ancestor example scope.
  const filesByVariable = new Map<string, string[]>();
  for (const usage of scanResult.used) {
    const files = filesByVariable.get(usage.variable) ?? [];
    files.push(usage.file);
    filesByVariable.set(usage.variable, files);
  }

  const isCovered = (variable: string, file: string): boolean => {
    // Primary comparison file applies to every file (root inheritance).
    if (envKeys.has(variable)) return true;
    if (scopes.length === 0) return false;

    const fileDir = dirOf(file);
    return scopes.some(
      (scope) => scope.keys.has(variable) && isWithinScope(fileDir, scope.dir),
    );
  };

  const missingUnfiltered = [...usedVariables].filter((variable) => {
    // Every variable in usedVariables came from scanResult.used, so it always
    // has an entry in filesByVariable.
    const files = filesByVariable.get(variable)!;
    return files.some((file) => !isCovered(variable, file));
  });
  const missing = filterIgnoredKeys(missingUnfiltered, ignore, ignoreRegex);
  const unused = [...envKeys].filter((v) => !usedVariables.has(v));

  // Cross-reference missing (used but undefined) keys against the defined keys
  // to surface likely typos, e.g. code uses DATABASE_URL but .env has DATABAS_URL.
  const suggestions = suggestTypos(missing, [...envKeys]);

  return {
    ...scanResult,
    missing,
    unused,
    suggestions,
  };
}

/**
 * Returns the forward-slashed directory of a relative file path.
 * @param file - The relative, forward-slashed file path.
 * @returns The directory portion, or an empty string for a root-level file.
 */
function dirOf(file: string): string {
  const idx = file.lastIndexOf('/');
  return idx === -1 ? '' : file.slice(0, idx);
}

/**
 * Checks whether a file's directory is inside (or equal to) a scope directory.
 * @param fileDir - The file's directory, relative and forward-slashed.
 * @param scopeDir - The scope directory, relative and forward-slashed.
 * @returns True when fileDir is the scope directory or a descendant of it.
 */
function isWithinScope(fileDir: string, scopeDir: string): boolean {
  return fileDir === scopeDir || fileDir.startsWith(`${scopeDir}/`);
}
