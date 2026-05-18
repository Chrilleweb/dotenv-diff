import type { EnvUsage } from '../../config/types.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';
import { label, value, error, divider, padLabel } from '../theme.js';

/**
 * Print missing environment variables (used in code but not in env file).
 *
 * @param missing - List of missing variables
 * @param used - All usages found in the codebase
 * @param comparedAgainst - Name of the env file or example file
 * @returns true if any missing variables were printed
 */
export function printMissing(
  missing: string[],
  used: EnvUsage[],
  comparedAgainst: string,
): boolean {
  if (missing.length === 0) return false;

  const fileType = comparedAgainst || 'environment file';

  console.log();
  console.log(`${error('▸')} ${value.bold(`Missing in ${fileType}`)}`);
  console.log(`${divider}`);

  const firstUsageByVariable = new Map<string, EnvUsage>();

  for (const usage of used) {
    if (!missing.includes(usage.variable)) continue;
    if (!firstUsageByVariable.has(usage.variable)) {
      firstUsageByVariable.set(usage.variable, usage);
    }
  }

  for (const variable of missing) {
    const usage = firstUsageByVariable.get(variable);
    if (!usage) continue;

    console.log(
      `${label(padLabel(variable))}${error(`${normalizePath(usage.file)}:${usage.line}`)}`,
    );
  }

  console.log(`${divider}`);

  return true;
}
