import type { InconsistentNamingWarning } from '../../config/types.js';
import {
  UI_LABEL_WIDTH,
  label,
  warning,
  error,
  divider,
  header,
  wrapReason,
} from '../theme.js';

/**
 * Prints warnings about inconsistent naming patterns in environment variables.
 * @param warnings Array of inconsistent naming warnings
 * @param strict Whether strict mode is enabled
 * @returns void
 */
export function printInconsistentNamingWarning(
  warnings: InconsistentNamingWarning[],
  strict: boolean = false,
): void {
  if (warnings.length === 0) return;

  const indicator = strict ? error('▸') : warning('▸');
  const textColor = strict ? error : warning;

  console.log();
  console.log(`${indicator} ${header('Inconsistent naming')}`);
  console.log(`${divider}`);

  for (const { key1, key2, suggestion } of warnings) {
    const suggestionText = `Use only: ${suggestion}`;
    console.log(
      `${label(`${key1} ↔ ${key2}`.padEnd(UI_LABEL_WIDTH))}${textColor(wrapReason(suggestionText))}`,
    );
  }

  console.log(`${divider}`);
}
