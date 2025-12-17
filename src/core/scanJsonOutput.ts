import type {
  ScanUsageOptions,
  ScanResult,
  EnvUsage,
  ScanJsonEntry,
} from '../config/types.js';
import { computeHealthScore } from './computeHealthScore.js';

/**
 * Creates a JSON output for the scan results.
 * @param scanResult - The result of the scan.
 * @param opts - The scan options.
 * @param comparedAgainst - The file being compared against.
 * @param totalEnvVariables - The total number of environment variables.
 * @returns The JSON output.
 */
export function createJsonOutput(
  scanResult: ScanResult,
  opts: ScanUsageOptions,
  comparedAgainst: string,
  totalEnvVariables: number,
): ScanJsonEntry {
  // Group usages by variable for missing variables
  const missingGrouped = scanResult.missing.map((variable: string) => ({
    variable,
    usages: scanResult.used
      .filter((u: EnvUsage) => u.variable === variable)
      .map((u: EnvUsage) => ({
        file: u.file,
        line: u.line,
        pattern: u.pattern,
        context: u.context,
      })),
  }));

  const healthScore = computeHealthScore(scanResult);

  const output: ScanJsonEntry = {
    stats: scanResult.stats,
    missing: missingGrouped,
    unused: scanResult.unused,
  };

  if (scanResult.secrets?.length) {
    (output as ScanJsonEntry).secrets = scanResult.secrets.map((s) => ({
      file: s.file,
      line: s.line,
      message: s.message,
      snippet: s.snippet,
    }));
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

  if (scanResult.t3EnvWarnings?.length) {
    output.t3EnvWarnings = scanResult.t3EnvWarnings.map((w) => ({
      variable: w.variable,
      reason: w.reason,
      file: w.file,
      line: w.line,
    }));
  }

  // Add duplicates if found
  if (scanResult.duplicates) {
    output.duplicates = scanResult.duplicates;
  }

  // Add comparison info if we compared against a file
  if (comparedAgainst) {
    output.comparedAgainst = comparedAgainst;
    output.totalEnvVariables = totalEnvVariables;
  }

  // Optionally include all usages
  if (opts.showStats) {
    output.allUsages = scanResult.used.map((u: EnvUsage) => ({
      variable: u.variable,
      file: u.file,
      line: u.line,
      pattern: u.pattern,
      context: u.context,
    }));
  }

  output.healthScore = healthScore;

  return output;
}
