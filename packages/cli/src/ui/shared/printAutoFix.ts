import type { FixContext } from '../../config/types.js';
import {
  UI_LABEL_WIDTH,
  label,
  value,
  accent,
  divider,
  header,
  wrapReason,
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
    console.log(
      `${label('Status'.padEnd(UI_LABEL_WIDTH))}${value('no changes needed')}`,
    );
  } else {
    if (result.removedDuplicates.length) {
      console.log(
        `${label('Removed duplicates'.padEnd(UI_LABEL_WIDTH))}${value(wrapReason(result.removedDuplicates.join(', '), 26))}`,
      );
    }
    if (result.addedEnv.length) {
      console.log(
        `${label('Added missing keys'.padEnd(UI_LABEL_WIDTH))}${value(wrapReason(result.addedEnv.join(', '), 26))}`,
      );
    }
    if (result.gitignoreUpdated) {
      console.log(
        `${label('Updated .gitignore'.padEnd(UI_LABEL_WIDTH))}${value(wrapReason(envName, 26))}`,
      );
    }
  }

  console.log(`${divider}`);
}
