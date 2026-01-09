import chalk from 'chalk';
import { type FrameworkWarning, type Framework } from '../../config/types.js';

const FRAMEWORK_LABELS: Record<Framework, string> = {
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

  console.log(
    chalk.yellow(
      `⚠️  Framework issues (${FRAMEWORK_LABELS[warnings[0]?.framework ?? 'unknown']}):`,
    ),
  );

  for (const w of warnings) {
    console.log(
      chalk.yellow(`   - ${w.variable} (${w.file}:${w.line}) → ${w.reason}`),
    );
  }

  console.log();
}
