import type { ScanResult } from '../config/types.js';

/**
 * Computes a health score based on the scan results.
 * @param scan - The result of the scan.
 * @returns The computed health score as a number between 0 and 100.
 */
export function computeHealthScore(scan: ScanResult): number {
  let score = 100;

  // === 1. Secrets detected ===
  const highSecrets = scan.secrets?.filter((s) => s.severity === 'high') ?? [];
  const medSecrets = scan.secrets?.filter((s) => s.severity === 'medium') ?? [];

  score -= highSecrets.length * 20;
  score -= medSecrets.length * 10;

  // === 2. Missing environment variables ===
  score -= scan.missing.length * 20;

  // === 3. Uppercase naming issues ===
  score -= (scan.uppercaseWarnings?.length ?? 0) * 2;

  // === 4. Console logging ===
  score -= (scan.logged?.length ?? 0) * 10;

  // === 5. Unused vars (less important) ===
  score -= (scan.unused?.length ?? 0) * 1;

  // === 6. Framework warnings ===
  score -= (scan.frameworkWarnings?.length ?? 0) * 5;

  // === 7. Example secrets ===
  score -= (scan.exampleWarnings?.length ?? 0) * 10;

  // === 8. Expiration warnings ===
  score -= (scan.expireWarnings?.length ?? 0) * 5;

  // === 9. Inconsistent naming warnings ===
  score -= (scan.inconsistentNamingWarnings?.length ?? 0) * 3;

  // Never go below 0 or above 100
  return Math.max(0, Math.min(100, score));
}
