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
    (scanResult.frameworkWarnings?.length ?? 0) +
    (scanResult.exampleWarnings?.length ?? 0) +
    (scanResult.logged?.length ?? 0) +
    (scanResult.uppercaseWarnings?.length ?? 0) +
    (scanResult.expireWarnings?.length ?? 0) +
    (scanResult.inconsistentNamingWarnings?.length ?? 0) +
    (scanResult.commentWarnings?.length ?? 0) +
    (scanResult.driftWarnings?.length ?? 0) +
    (scanResult.secrets?.length ?? 0) +
    scanResult.missing.length +
    scanResult.unused.length +
    (scanResult.duplicates?.env?.length ?? 0) +
    (scanResult.duplicates?.example?.length ?? 0);

  return {
    filesScanned: scanResult.stats.filesScanned,
    totalUsages: scanResult.used.length,
    uniqueVariables,
    warningsCount,
    duration: scanResult.stats.duration,
  };
}
