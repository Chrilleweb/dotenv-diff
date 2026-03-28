import type {
  FrameworkWarning,
  DetectedFramework,
} from '../../config/types.js';
import {
  UI_LABEL_WIDTH,
  label,
  warning,
  error,
  dim,
  divider,
  header,
  wrapReason,
  padLabel,
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
  strict: boolean = false,
): void {
  if (!warnings || warnings.length === 0) return;

  const frameworkLabel = FRAMEWORK_LABELS[warnings[0]!.framework];
  const indicator = strict ? error('▸') : warning('▸');
  const textColor = strict ? error : warning;

  // Group by variable+reason, collect unique locations
  const grouped = new Map<
    string,
    { w: FrameworkWarning; locations: string[] }
  >();
  for (const w of warnings) {
    const key = `${w.variable}:${w.reason}`;
    if (!grouped.has(key)) grouped.set(key, { w, locations: [] });
    const loc = `${normalizePath(w.file)}:${w.line}`;
    if (!grouped.get(key)!.locations.includes(loc)) {
      grouped.get(key)!.locations.push(loc);
    }
  }

  console.log();
  console.log(`${indicator} ${header(`Framework issues (${frameworkLabel})`)}`);
  console.log(`${divider}`);

  for (const { w, locations } of grouped.values()) {
    console.log(
      `${label(padLabel(w.variable))}${textColor(wrapReason(w.reason))}`,
    );
    for (const loc of locations) {
      console.log(`${label(''.padEnd(UI_LABEL_WIDTH))}${dim(loc)}`);
    }
  }

  console.log(`${divider}`);
}
