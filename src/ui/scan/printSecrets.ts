import chalk from 'chalk';
import { type SecretFinding } from '../../core/secretDetectors.js';

/**
 * Get the icon representing the severity level.
 * @param severity - The severity level of the secret finding.
 * @returns The corresponding icon as a string.
 */
function getSeverityIcon(severity: SecretFinding['severity']): string {
  switch (severity) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '🔵';
  }
}

/** Get the color function for the severity level.
 * @param severity - The severity level of the secret finding.
 * @returns The corresponding chalk color function.
 */
function getSeverityColor(severity: SecretFinding['severity']): (text: string) => string {
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

function getSeverityLabel(severity: 'high' | 'medium' | 'low'): string {
  return severity.toUpperCase();
}

/**
 * Print potential secrets detected in the codebase.
 */
export function printSecrets(secrets: SecretFinding[], json: boolean): void {
  if (json) return;
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
    console.log(chalk.bold(`  ${file}`));
    for (const f of findings) {
      const icon = getSeverityIcon(f.severity);
      const color = getSeverityColor(f.severity);
      const label = getSeverityLabel(f.severity);

      console.log(
        color(
          `   ${icon} ${label}: Line ${f.line} - ${f.message}\n     ${chalk.dim(f.snippet)}`,
        ),
      );
    }
  }
  console.log();
}
