import type { Filtered } from '../../config/types.js';
import {
  UI_LABEL_WIDTH,
  label,
  warning,
  error,
  dim,
  divider,
  header,
} from '../theme.js';

/**
 * Prints the issues found during the comparison.
 * @param filtered The filtered comparison results.
 * @param json Whether to output in JSON format.
 * @param fix Whether fix mode is enabled (skips printing missing keys as they will be fixed).
 * @returns void
 */
export function printIssues(
  filtered: Filtered,
  json: boolean,
  fix: boolean = false,
): void {
  if (json) return;

  if (filtered.missing.length && !fix) {
    console.log();
    console.log(`${error('▸')} ${header('Missing keys')}`);
    console.log(`${divider}`);
    for (const key of filtered.missing) {
      console.log(`${label(key.padEnd(UI_LABEL_WIDTH))}${error('missing')}`);
    }
    console.log(`${divider}`);
  }

  if (filtered.extra?.length) {
    console.log();
    console.log(`${warning('▸')} ${header('Extra keys (not in example)')}`);
    console.log(`${divider}`);
    for (const key of filtered.extra) {
      console.log(`${label(key.padEnd(UI_LABEL_WIDTH))}${warning('extra')}`);
    }
    console.log(`${divider}`);
  }

  if (filtered.empty?.length) {
    console.log();
    console.log(`${warning('▸')} ${header('Empty values')}`);
    console.log(`${divider}`);
    for (const key of filtered.empty) {
      console.log(`${label(key.padEnd(UI_LABEL_WIDTH))}${warning('empty')}`);
    }
    console.log(`${divider}`);
  }

  if (filtered.mismatches?.length) {
    console.log();
    console.log(`${warning('▸')} ${header('Value mismatches')}`);
    console.log(`${divider}`);
    for (const { key, expected, actual } of filtered.mismatches) {
      console.log(
        `${label(key.padEnd(UI_LABEL_WIDTH))}${warning(`expected: ${expected}`)}  ${dim(`got: ${actual}`)}`,
      );
    }
    console.log(`${divider}`);
  }
}
