import chalk from 'chalk';
import type { SecretFinding } from '../../core/security/secretDetectors.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';

/** Get the color function for the severity level.
 * @param severity - The severity level of the secret finding.
 * @returns The corresponding chalk color function.
 */
function getSeverityColor(
  severity: SecretFinding['severity'],
): (text: string) => string {
  switch (severity) {
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.green;
    default:
      return chalk.blue;
  }
}

/** Get the label for the severity level.
 * @param severity - The severity level of the secret finding.
 * @returns The corresponding label as a string.
 */
function getSeverityLabel(severity: SecretFinding['severity']): string {
  return severity.toUpperCase();
}

/**
 * Print potential secrets detected in the codebase.
 * @param secrets - List of secret findings
 * @returns void
 */
export function printSecrets(secrets: SecretFinding[]): void {
  if (!secrets || secrets.length === 0) return;

  // Sort by severity (high -> medium -> low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...secrets].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  console.log(chalk.yellow('🔒 Potential secrets detected in codebase:'));

  // Group by file
  const byFile = new Map<string, SecretFinding[]>();
  for (const f of sorted) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [file, findings] of byFile) {
    const normalizedFile = normalizePath(file);

    console.log(chalk.bold(`   ${normalizedFile}`));

    for (const f of findings) {
      const color = getSeverityColor(f.severity);
      const label = getSeverityLabel(f.severity);

      console.log(
        color(
          `    ${label}: Line ${f.line} - ${f.message}\n    ${chalk.dim(f.snippet)}`,
        ),
      );
    }
  }
  console.log();
}
