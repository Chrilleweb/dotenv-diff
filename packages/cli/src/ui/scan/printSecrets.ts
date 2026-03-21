import type { SecretFinding } from '../../core/security/secretDetectors.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';
import {
  UI_LABEL_WIDTH,
  label,
  accent,
  warning,
  error,
  divider,
  header,
} from '../theme.js';

/**
 * Get the color function for the severity level.
 * @param severity - The severity level of the secret finding.
 * @returns The corresponding theme color function.
 */
function getSeverityColor(
  severity: SecretFinding['severity'],
): (text: string) => string {
  switch (severity) {
    case 'high':
      return error;
    case 'medium':
      return warning;
    default:
      return accent;
  }
}

/**
 * Print potential secrets detected in the codebase.
 * @param secrets - List of secret findings
 * @param strict - Whether strict mode is enabled
 * @returns void
 */
export function printSecrets(
  secrets: SecretFinding[],
  strict: boolean = false,
): void {
  if (!secrets || secrets.length === 0) return;

  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...secrets].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const indicator = strict ? error('▸') : warning('▸');

  console.log();
  console.log(`${indicator} ${header('Potential secrets detected')}`);
  console.log(`${divider}`);

  const byFile = new Map<string, SecretFinding[]>();
  for (const f of sorted) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [, findings] of byFile) {
    for (const f of findings) {
      const color = getSeverityColor(f.severity);
      console.log(
        `${label(f.severity.toUpperCase().padEnd(UI_LABEL_WIDTH))}${color(`${normalizePath(f.file)}:${f.line}`)}`,
      );
    }
  }

  console.log(`${divider}`);
}
