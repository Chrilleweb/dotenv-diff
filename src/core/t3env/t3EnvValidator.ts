import type { EnvUsage, T3EnvWarning } from '../../config/types.js';
import { detectT3Env } from './detectT3Env.js';
import { applyT3EnvRules } from './t3EnvRules.js';

/**
 * Validates environment variable usages against t3-env schema and returns deduplicated warnings
 * @param usages - Array of environment variable usages
 * @param cwd - Current working directory to detect t3-env
 * @returns Array of deduplicated t3-env warnings
 */
export async function t3EnvValidator(
  usages: EnvUsage[],
  cwd: string,
): Promise<T3EnvWarning[]> {
  const t3Detection = await detectT3Env(cwd);

  if (!t3Detection.detected || !t3Detection.schema) {
    return [];
  }

  const warnings: T3EnvWarning[] = [];

  for (const usage of usages) {
    applyT3EnvRules(usage, warnings, t3Detection.schema);
  }

  // Deduplicate warnings based on variable + reason only (not file or line)
  // This ensures one warning per variable across all files
  if (warnings.length === 0) {
    return [];
  }

  const seen = new Map<string, T3EnvWarning>();
  for (const w of warnings) {
    const key = `${w.variable}|${w.reason}`;
    if (!seen.has(key)) {
      seen.set(key, w);
    }
  }

  return Array.from(seen.values());
}
