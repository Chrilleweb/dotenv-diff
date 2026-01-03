import type { ScanResult, EnvUsage, ScanJsonEntry } from '../config/types.js';
import { computeHealthScore } from './computeHealthScore.js';

/**
 * Creates a JSON output for the scan results.
 * @param scanResult - The result of the scan.
 * @param comparedAgainst - The file being compared against.
 * @returns The JSON output.
 */
export function createJsonOutput(
  scanResult: ScanResult,
  comparedAgainst: string,
): ScanJsonEntry {
  const output: ScanJsonEntry = {};

  // Add comparison info if we compared against a file
  if (comparedAgainst) {
    output.comparedAgainst = comparedAgainst;
  }

  output.stats = scanResult.stats;

  if (scanResult.secrets?.length) {
    output.secrets = scanResult.secrets.map((s) => ({
      file: s.file,
      line: s.line,
      message: s.message,
      snippet: s.snippet,
    }));
  }

  if (scanResult.missing?.length) {
    const missingSet = new Set(scanResult.missing);
    const usagesByVariable = new Map<string, EnvUsage[]>();

    for (const usage of scanResult.used) {
      if (missingSet.has(usage.variable)) {
        const existing = usagesByVariable.get(usage.variable) ?? [];
        existing.push(usage);
        usagesByVariable.set(usage.variable, existing);
      }
    }

    output.missing = scanResult.missing.map((variable) => ({
      variable,
      usages: (usagesByVariable.get(variable) ?? []).map((u) => ({
        file: u.file,
        line: u.line,
        pattern: u.pattern,
        context: u.context,
      })),
    }));
  }

  if (scanResult.unused?.length) {
    output.unused = scanResult.unused;
  }

  if (scanResult.uppercaseWarnings?.length) {
    output.uppercaseWarnings = scanResult.uppercaseWarnings.map((w) => ({
      key: w.key,
      suggestion: w.suggestion,
    }));
  }

  if (scanResult.inconsistentNamingWarnings?.length) {
    output.inconsistentNamingWarnings =
      scanResult.inconsistentNamingWarnings.map((w) => ({
        key1: w.key1,
        key2: w.key2,
        suggestion: w.suggestion,
      }));
  }

  if (scanResult.frameworkWarnings?.length) {
    output.frameworkWarnings = scanResult.frameworkWarnings.map((w) => ({
      variable: w.variable,
      reason: w.reason,
      file: w.file,
      line: w.line,
      framework: w.framework,
    }));
  }

  const hasDuplicates =
    (scanResult.duplicates.env?.length ?? 0) > 0 ||
    (scanResult.duplicates.example?.length ?? 0) > 0;

  if (hasDuplicates) {
    output.duplicates = scanResult.duplicates;
  }

  // Add logged variables if any
  if (scanResult.logged?.length) {
    output.logged = scanResult.logged.map((l) => ({
      variable: l.variable,
      file: l.file,
      line: l.line,
      context: l.context,
    }));
  }

  // Example warnings
  if (scanResult.exampleWarnings?.length) {
    output.exampleWarnings = scanResult.exampleWarnings.map((w) => ({
      key: w.key,
      value: w.value,
      reason: w.reason,
      severity: w.severity,
    }));
  }

  const healthScore = computeHealthScore(scanResult);
  output.healthScore = healthScore;

  return output;
}
