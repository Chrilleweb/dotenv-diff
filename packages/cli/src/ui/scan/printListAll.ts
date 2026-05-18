import type { EnvUsage } from '../../config/types.js';
import { accent, dim, header, divider } from '../theme.js';

/**
 * Prints all unique environment variable names found in the codebase scan.
 * @param usages - All environment variable usages found during the scan.
 */
export function printListAll(usages: EnvUsage[]): void {
  const uniqueVars = [...new Set(usages.map((u) => u.variable))].sort();

  if (uniqueVars.length === 0) {
    console.log(dim('\nNo environment variables found in codebase.\n'));
    return;
  }

  console.log(
    `\n${accent('▸')} ${header('Environment variables found in codebase')}`,
  );
  console.log(`${divider}`);

  for (const key of uniqueVars) {
    console.log(`${accent(key)}`);
  }

  console.log(`${divider}`);
  console.log(dim(`${uniqueVars.length} unique variable(s)`));
  console.log(`${divider}`);
}
