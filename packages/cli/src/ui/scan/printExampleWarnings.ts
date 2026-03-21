import type { ExampleSecretWarning } from '../../config/types.js';
import {
  UI_LABEL_WIDTH,
  label,
  warning,
  error,
  divider,
  header,
} from '../theme.js';

/**
 * Prints example file secret warnings to the console.
 * @param warnings - List of example file secret warnings
 * @param strict - Whether strict mode is enabled
 */
export function printExampleWarnings(
  warnings: ExampleSecretWarning[],
  strict: boolean = false,
): void {
  if (!warnings || warnings.length === 0) return;

  const indicator =
    strict || warnings.some((w) => w.severity === 'high')
      ? error('▸')
      : warning('▸');

  console.log();
  console.log(`${indicator} ${header('Potential secrets in .env.example')}`);
  console.log(`${divider}`);

  for (const w of warnings) {
    const severityColor = w.severity === 'high' ? error : warning;
    console.log(
      `${label(w.key.padEnd(UI_LABEL_WIDTH))}${severityColor(`${w.reason} [${w.severity}]`)}`,
    );
  }

  console.log(`${divider}`);
}
