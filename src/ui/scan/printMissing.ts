import type { EnvUsage, VariableUsages } from '../../config/types.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';
import { label, value, error, divider } from '../theme.js';


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

  const grouped = missing.reduce((acc: VariableUsages, variable: string) => {
    const usages = used.filter((u: EnvUsage) => u.variable === variable);
    acc[variable] = usages;
    return acc;
  }, {});

  const byFile = new Map<string, Array<{ variable: string; usage: EnvUsage }>>();

  for (const [variable, usages] of Object.entries(grouped)) {
    for (const usage of usages) {
      const file = normalizePath(usage.file);
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file)!.push({ variable, usage });
    }
  }

  for (const [file, items] of byFile) {
    for (const { variable, usage } of items) {
      console.log(`${label(variable.padEnd(26))}${value(`${normalizePath(usage.file)}:${usage.line}`)}`);
    }
    console.log();
  }

  console.log(`${divider}`);

  return true;
}
