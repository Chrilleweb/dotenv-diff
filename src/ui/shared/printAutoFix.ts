import type { FixContext } from '../../config/types.js';
import { label, value, accent, dim, divider, header } from '../theme.js';

/**
 * Prints the result of the auto-fix operation.
 * @param result - The result of the auto-fix operation.
 * @param envName - The name of the environment file.
 * @param json - Whether to output in JSON format.
 * @returns void
 */
export function printAutoFix(
  result: FixContext,
  envName: string,
  json: boolean,
): void {
  if (json) return;

  console.log();
  console.log(`${accent('▸')} ${header('Auto-fix')}`);
  console.log(`${divider}`);

  if (!result.fixApplied) {
    console.log(`${label('Status'.padEnd(26))}${value('no changes needed')}`);
  } else {
    if (result.removedDuplicates.length) {
      console.log(`${label('Removed duplicates'.padEnd(26))}${value(result.removedDuplicates.join(', '))}`);
    }
    if (result.addedEnv.length) {
      console.log(`${label('Added missing keys'.padEnd(26))}${value(result.addedEnv.join(', '))}`);
    }
    if (result.gitignoreUpdated) {
      console.log(`${label('Updated .gitignore'.padEnd(26))}${value(envName)}`);
    }
  }

  console.log(`${divider}`);
}
