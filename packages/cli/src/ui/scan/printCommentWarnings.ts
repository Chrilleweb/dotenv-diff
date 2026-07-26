import type { CommentWarning } from '../../config/types.js';
import { label, error, warning, divider, header, padLabel } from '../theme.js';

/**
 * Prints warnings for `.env.example` keys that lack a documenting comment.
 * @param warnings Array of undocumented-key warnings
 * @param strict Whether strict mode is enabled (colours the row as an error)
 * @returns void
 */
export function printCommentWarnings(
  warnings: CommentWarning[],
  strict: boolean = false,
): void {
  if (warnings.length === 0) return;

  const indicator = strict ? error('▸') : warning('▸');
  const rowColor = strict ? error : warning;

  console.log();
  console.log(`${indicator} ${header('Undocumented keys')}`);
  console.log(`${divider}`);

  for (const warn of warnings) {
    console.log(
      `${label(padLabel(warn.key))}${rowColor('missing a documenting # comment')}`,
    );
  }

  console.log(`${divider}`);
}
