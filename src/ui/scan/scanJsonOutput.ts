import type {
  ScanResult,
  EnvUsage,
  Duplicate,
  SupportedFramework,
} from '../../config/types.js';
import { computeHealthScore } from '../../core/scan/computeHealthScore.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';

/**
 * JSON structure for scan results output
 */
interface ScanJsonOutput {
  stats?: {
    filesScanned: number;
    totalUsages: number;
    uniqueVariables: number;
    warningsCount: number;
    duration: number;
  };
  missing?: Array<{
    variable: string;
    usages: Array<{
      file: string;
      line: number;
      pattern: string;
      context: string;
    }>;
  }>;
  unused?: string[];
  allUsages?: Array<{
    variable: string;
    file: string;
    line: number;
    pattern: string;
    context: string;
  }>;
  comparedAgainst?: string;
  totalEnvVariables?: number;
  secrets?: Array<{
    file: string;
    line: number;
    message: string;
    snippet: string;
  }>;
  duplicates?: {
    env?: Duplicate[];
    example?: Duplicate[];
  };
  logged?: Array<{
    variable: string;
    file: string;
    line: number;
    context: string;
  }>;
  expireWarnings?: Array<{
    key: string;
    date: string;
    daysLeft: number;
  }>;
  uppercaseWarnings?: Array<{
    key: string;
    suggestion: string;
  }>;
  inconsistentNamingWarnings?: Array<{
    key1: string;
    key2: string;
    suggestion: string;
  }>;
  frameworkWarnings?: Array<{
    variable: string;
    reason: string;
    file: string;
    line: number;
    framework: SupportedFramework;
  }>;
  exampleWarnings?: Array<{
    key: string;
    value: string;
    reason: string;
    severity: string;
  }>;
  healthScore?: number;
}

/**
 * Creates a JSON output for the scan results.
 * @param scanResult - The result of the scan.
 * @param comparedAgainst - The file being compared against.
 * @returns The JSON output.
 */
export function scanJsonOutput(
  scanResult: ScanResult,
  comparedAgainst: string,
): ScanJsonOutput {
  const output: ScanJsonOutput = {};

  // Add comparison info if we compared against a file
  if (comparedAgainst) {
    output.comparedAgainst = comparedAgainst;
  }

  output.stats = scanResult.stats;

  if (scanResult.secrets?.length) {
    output.secrets = scanResult.secrets.map((s) => ({
      file: normalizePath(s.file),
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
        file: normalizePath(u.file),
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
      file: normalizePath(w.file),
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
      file: normalizePath(l.file),
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
