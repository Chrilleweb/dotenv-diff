import type { EnvUsage, TypoSuggestion } from '../../config/types.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';
import { label, value, error, dim, divider, padLabel } from '../theme.js';

/**
 * Print missing environment variables (used in code but not in env file).
 *
 * @param missing - List of missing variables
 * @param used - All usages found in the codebase
 * @param comparedAgainst - Name of the env file or example file
 * @param suggestions - Optional typo suggestions to annotate missing variables with
 * @returns true if any missing variables were printed
 */
export function printMissing(
  missing: string[],
  used: EnvUsage[],
  comparedAgainst: string,
  suggestions: TypoSuggestion[] = [],
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

  const suggestionByKey = new Map(
    suggestions.map((s) => [s.key, s.didYouMean]),
  );

  for (const variable of missing) {
    const usage = firstUsageByVariable.get(variable);
    if (!usage) continue;

    const didYouMean = suggestionByKey.get(variable);
    const hint = didYouMean ? `  ${dim(`→ did you mean ${didYouMean}?`)}` : '';

    console.log(
      `${label(padLabel(variable))}${error(`${normalizePath(usage.file)}:${usage.line}`)}${hint}`,
    );
  }

  console.log(`${divider}`);

  return true;
}
