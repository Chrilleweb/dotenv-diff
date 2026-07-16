import type { ScanResult } from '../../config/types.js';
import { filterIgnoredKeys } from '../helpers/filterIgnoredKeys.js';
import { suggestTypos } from '../suggestTypos.js';

/**
 * Compares the scan result with the environment variables.
 * This function identifies missing and unused environment variables.
 * @param scanResult - The result of the scan.
 * @param envVariables - The environment variables to compare against.
 * @param ignore - List of keys to ignore.
 * @param ignoreRegex - List of regex patterns to ignore.
 * @returns The comparison result.
 */
export function compareWithEnvFiles(
  scanResult: ScanResult,
  envVariables: Record<string, string | undefined>,
  ignore: string[] = [],
  ignoreRegex: RegExp[] = [],
): ScanResult {
  const usedVariables = new Set(scanResult.used.map((u) => u.variable));
  const envKeys = new Set(Object.keys(envVariables));

  const missingUnfiltered = [...usedVariables].filter((v) => !envKeys.has(v));
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
