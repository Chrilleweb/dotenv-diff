import type { ScanResult } from '../config/types.js';

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