import type { ExampleSecretWarning } from '../../config/types.js';
import { label, warning, error, divider, header, padLabel } from '../theme.js';

/**
 * Prints example file secret warnings to the console.
 *
 * Laid out like the code secret report — the detected message on the left, the
 * thing it was found in on the right — so both read the same. The locator is the
 * key rather than a line number: in an env file the key is what you go and fix.
 * @param warnings - List of example file secret warnings
 * @param strict - Whether strict mode is enabled
 */
export function printExampleWarnings(
  warnings: ExampleSecretWarning[],
  strict: boolean = false,
): void {
  const first = warnings?.[0];
  if (!first) return;

  const indicator =
    strict || warnings.some((w) => w.severity === 'high')
      ? error('▸')
      : warning('▸');

  console.log();
  console.log(`${indicator} ${header(`Potential secrets in ${first.file}`)}`);
  console.log(`${divider}`);

  for (const w of warnings) {
    const severityColor = w.severity === 'high' ? error : warning;
    console.log(`${label(padLabel(w.message))}${severityColor(w.key)}`);
  }

  console.log(`${divider}`);
}
