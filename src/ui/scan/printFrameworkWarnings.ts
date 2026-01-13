import chalk from 'chalk';
import type {
  FrameworkWarning,
  DetectedFramework,
} from '../../config/types.js';

const FRAMEWORK_LABELS: Record<DetectedFramework, string> = {
  nextjs: 'Next.js',
  sveltekit: 'SvelteKit',
  unknown: 'Unknown Framework',
};

/**
 * Prints environment variable usage warnings to the console.
 * @param warnings - List of environment variable warnings
 * @param json - Whether to output in JSON format
 */
export function printFrameworkWarnings(
  warnings: FrameworkWarning[],
  json: boolean,
): void {
  if (!warnings || warnings.length === 0) return;

  if (json) {
    console.log(JSON.stringify({ frameworkWarnings: warnings }, null, 2));
    return;
  }

  // Deduplicate warnings by variable + file + line + reason
  const uniqueWarnings = Array.from(
    new Map(
      warnings.map((w) => [`${w.variable}:${w.file}:${w.line}:${w.reason}`, w]),
    ).values(),
  );

  console.log(
    chalk.yellow(
      `⚠️  Framework issues (${FRAMEWORK_LABELS[uniqueWarnings[0]?.framework ?? 'unknown']}):`,
    ),
  );

  for (const w of uniqueWarnings) {
    console.log(
      chalk.yellow(`   - ${w.variable} (${w.file}:${w.line}) → ${w.reason}`),
    );
  }

  console.log();
}
