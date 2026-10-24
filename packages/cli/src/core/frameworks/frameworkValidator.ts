import type {
  EnvUsage,
  Framework,
  FrameworkWarning,
} from '../../config/types.js';
import { normalizePath } from '../helpers/normalizePath.js';
import { detectFramework } from './frameworkDetector.js';

/**
 * Validates environment variable usages against the rules of the project's framework
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
  const detection = detectFramework(cwd);
  if (!detection) {
    return [];
  }

  return validateUsages(usages, detection.framework, fileContentMap);
}

/**
 * Validates environment variable usages against the rules of a given framework
 * @param usages - Array of environment variable usages
 * @param framework - The framework whose rules to apply
 * @param fileContentMap - Map of file paths to their content for detecting client components
 * @returns Array of framework-specific warnings
 */
export function validateUsages(
  usages: EnvUsage[],
  framework: Framework,
  fileContentMap?: Map<string, string>,
): FrameworkWarning[] {
  const warnings: FrameworkWarning[] = [];

  for (const usage of usages) {
    // Normalize path separators for cross-platform consistency
    const file = normalizePath(usage.file);

    if (file.includes('/node_modules/')) {
      continue;
    }

    const reason = framework.check(usage, {
      file,
      content: fileContentMap?.get(usage.file),
    });

    if (reason) {
      warnings.push({
        variable: usage.variable,
        reason,
        file,
        line: usage.line,
        framework: framework.name,
      });
    }
  }

  return warnings;
}
