import type { EnvUsage } from '../config/types.js';
import type { UppercaseWarning } from '../config/types.js';

/** Convert key to proper UPPER_SNAKE_CASE
 * @param name - The environment variable name
 * @returns The name converted to UPPER_SNAKE_CASE
 */
function toUpperSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2') // camelCase → camel_Case
    .replace(/[-\s]+/g, '_') // dashes/spaces → underscore
    .toUpperCase();
}

/**
 * Detects environment variable keys that are not in uppercase format.
 * @param usages - List of environment variable usages
 * @returns List of warnings for non-uppercase keys
 */
export function detectUppercaseKeys(usages: EnvUsage[]): UppercaseWarning[] {
  const warnings: UppercaseWarning[] = [];

  for (const u of usages) {
    if (!/^[A-Z0-9_]+$/.test(u.variable)) {
      warnings.push({
        key: u.variable,
        suggestion: toUpperSnakeCase(u.variable),
      });
    }
  }

  return warnings;
}
