import type { FixContext } from '../../config/types.js';
import {
  label,
  value,
  accent,
  divider,
  header,
  wrapReason,
  padLabel,
} from '../theme.js';

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
    console.log(`${label(padLabel('Status'))}${value('no changes needed')}`);
  } else {
    if (result.removedDuplicates.length) {
      console.log(
        `${label(padLabel('Removed duplicates'))}${value(wrapReason(result.removedDuplicates.join(', ')))}`,
      );
    }
    if (result.addedEnv.length) {
      console.log(
        `${label(padLabel('Added missing keys'))}${value(wrapReason(result.addedEnv.join(', ')))}`,
      );
    }
    if (result.gitignoreUpdated) {
      console.log(
        `${label(padLabel('Updated .gitignore'))}${value(wrapReason(envName))}`,
      );
    }
  }

  console.log(`${divider}`);
}
