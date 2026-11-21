import type { ScanResult } from '../../config/types.js';

/**
 * Computes a health score based on the scan results.
 * @param scan - The result of the scan.
 * @returns The computed health score as a number between 0 and 100.
 */
export function computeHealthScore(scan: ScanResult): number {
  let score = 100;

  // === 1. Secrets detected ===
  const highSecrets = scan.secrets.filter((s) => s.severity === 'high');
  const medSecrets = scan.secrets.filter((s) => s.severity === 'medium');

  score -= highSecrets.length * 20;
  score -= medSecrets.length * 10;

  // === 2. Missing environment variables ===
  score -= scan.missing.length * 20;

  // === 3. Uppercase naming issues ===
  score -= scan.uppercaseWarnings.length * 2;

  // === 4. Console logging ===
  score -= scan.logged.length * 10;

  // === 5. Unused vars (less important) ===
  score -= scan.unused.length * 1;

  // === 6. Framework warnings ===
  score -= scan.frameworkWarnings.length * 5;

  // === 7. Example secrets ===
  score -= scan.exampleWarnings.length * 10;

  // === 8. Expiration warnings ===
  score -= scan.expireWarnings.length * 5;

  // === 9. Inconsistent naming warnings ===
  score -= scan.inconsistentNamingWarnings.length * 3;

  // === 9b. Undocumented example keys (advisory) ===
  score -= scan.commentWarnings.length * 2;

  // === 9c. Keys missing from the example file (advisory) ===
  score -= scan.driftWarnings.length * 2;

  // === 10. Duplicate definitions ===
  score -= scan.duplicates.env.length * 10;
  score -= scan.duplicates.example.length * 10;

  // Never go below 0 or above 100
  return Math.max(0, Math.min(100, score));
}
