import type { ScanResult } from '../../config/types.js';

/**
 * Compares the scan result with the environment variables.
 * This function identifies missing and unused environment variables.
 * @param scanResult - The result of the scan.
 * @param envVariables - The environment variables to compare against.
 * @returns The comparison result.
 */
export function compareWithEnvFiles(
  scanResult: ScanResult,
  envVariables: Record<string, string | undefined>,
): ScanResult {
  const usedVariables = new Set(scanResult.used.map((u) => u.variable));
  const envKeys = new Set(Object.keys(envVariables));

  const missing = [...usedVariables].filter((v) => !envKeys.has(v));
  const unused = [...envKeys].filter((v) => !usedVariables.has(v));

  return {
    ...scanResult,
    missing,
    unused,
  };
}
