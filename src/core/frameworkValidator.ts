import { type EnvUsage, type FrameworkWarning } from '../config/types.js';
import { detectFramework } from './frameworkDetector.js';
import { applySvelteKitRules, applyNextJsRules } from './frameworks/index.js';

/**
 * Validates environment variable usages against framework-specific rules
 * @param usages - Array of environment variable usages
 * @param cwd - Current working directory to detect framework
 * @param fileContentMap - Map of file paths to their content for detecting client components
 * @returns Array of framework-specific warnings
 */
export function frameworkValidator(
  usages: EnvUsage[],
  cwd: string,
  fileContentMap?: Map<string, string>,
): FrameworkWarning[] {
  const warnings: FrameworkWarning[] = [];
  const { framework } = detectFramework(cwd);

  for (const u of usages) {
    if (framework === 'sveltekit') applySvelteKitRules(u, warnings);
    if (framework === 'nextjs') applyNextJsRules(u, warnings, fileContentMap);
  }

  return warnings;
}
