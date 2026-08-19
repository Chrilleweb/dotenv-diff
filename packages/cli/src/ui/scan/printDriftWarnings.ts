import type { DriftWarning } from '../../config/types.js';
import { label, error, warning, divider, header, padLabel } from '../theme.js';

/**
 * Prints warnings for keys set in an env file but missing from the example file
 * that documents it.
 *
 * Every warning in a run concerns the same file pair — the scan checks one env
 * file — so the pair is read off the first warning and printed as one heading.
 * @param warnings Array of drift warnings, in env file order
 * @param strict Whether strict mode is enabled (colours the rows as errors)
 * @returns void
 */
export function printDriftWarnings(
  warnings: DriftWarning[],
  strict: boolean = false,
): void {
  const first = warnings[0];
  if (!first) return;

  const indicator = strict ? error('▸') : warning('▸');
  const rowColor = strict ? error : warning;
  const { envFile, exampleFile } = first;

  console.log();
  console.log(
    `${indicator} ${header(`Drift between ${envFile} and ${exampleFile}`)}`,
  );
  console.log(`${divider}`);

  for (const warn of warnings) {
    console.log(
      `${label(padLabel(warn.key))}${rowColor(`not documented in ${exampleFile}`)}`,
    );
  }

  console.log(`${divider}`);
}
