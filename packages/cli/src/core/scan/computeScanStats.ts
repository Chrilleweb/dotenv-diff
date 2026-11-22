import type { ScanResult, ScanStats } from '../../config/types.js';

/**
 * Computes scan statistics from the current state of a scan result.
 * Run it again after anything that adds or removes usages or warnings
 * (comparison, filtering, baseline suppression) so the stats stay accurate.
 * `filesScanned` and `duration` are carried over, since they describe the scan
 * itself rather than its findings.
 * @param scanResult - The current scan result
 * @returns Fresh stats for the scan result
 */
export function computeScanStats(scanResult: ScanResult): ScanStats {
  const uniqueVariables = new Set(scanResult.used.map((u) => u.variable)).size;

  const warningsCount =
    scanResult.frameworkWarnings.length +
    scanResult.exampleWarnings.length +
    scanResult.logged.length +
    scanResult.uppercaseWarnings.length +
    scanResult.expireWarnings.length +
    scanResult.inconsistentNamingWarnings.length +
    scanResult.commentWarnings.length +
    scanResult.driftWarnings.length +
    scanResult.secrets.length +
    scanResult.missing.length +
    scanResult.unused.length +
    scanResult.duplicates.env.length +
    scanResult.duplicates.example.length;

  return {
    filesScanned: scanResult.stats.filesScanned,
    totalUsages: scanResult.used.length,
    uniqueVariables,
    warningsCount,
    duration: scanResult.stats.duration,
  };
}
