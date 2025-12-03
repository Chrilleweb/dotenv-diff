import type { EnvUsage } from '../config/types.js';
import { detectFramework, type Framework } from './frameworkDetector.js';
import { applySvelteKitRules, applyNextJsRules } from './frameworks/index.js';

export interface frameworkWarning {
  variable: string;
  reason: string;
  file: string;
  line: number;
  framework: Framework;
}

export function frameworkValidator(
  usages: EnvUsage[],
  cwd: string,
): frameworkWarning[] {
  const warnings: frameworkWarning[] = [];
  const { framework } = detectFramework(cwd);

  for (const u of usages) {
    if (framework === 'sveltekit') applySvelteKitRules(u, warnings);
    if (framework === 'next') applyNextJsRules(u, warnings);
  }

  return warnings;
}
