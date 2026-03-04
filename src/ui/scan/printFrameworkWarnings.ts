import type {
  FrameworkWarning,
  DetectedFramework,
} from '../../config/types.js';
import {
  label,
  warning,
  error,
  divider,
  header,
} from '../theme.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';

/**
 * Labels for detected frameworks to display in warnings
 */
const FRAMEWORK_LABELS: Record<DetectedFramework, string> = {
  nextjs: 'Next.js',
  sveltekit: 'SvelteKit',
  unknown: 'Unknown Framework',
};

/**
 * Prints environment variable usage warnings to the console.
 * @param warnings - List of environment variable warnings
 * @param strict - Whether strict mode is enabled
 */
export function printFrameworkWarnings(
  warnings: FrameworkWarning[],
  strict = false,
): void {
  if (!warnings || warnings.length === 0) return;

  const uniqueWarnings = Array.from(
    new Map(
      warnings.map((w) => [`${w.variable}:${w.file}:${w.line}:${w.reason}`, w]),
    ).values(),
  );

  const frameworkLabel = FRAMEWORK_LABELS[uniqueWarnings[0]!.framework];
  const indicator = strict ? error('▸') : warning('▸');
  const textColor = strict ? error : warning;

  console.log();
  console.log(`${indicator} ${header(`Framework issues (${frameworkLabel})`)}`);
  console.log(`${divider}`);

  for (const w of uniqueWarnings) {
    console.log(
      `${label(w.variable.padEnd(26))}${textColor(`${normalizePath(w.file)}:${w.line}  ${w.reason}`)}`,
    );
  }

  console.log(`${divider}`);
}
