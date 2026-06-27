import type { MatrixResult } from '../../config/types.js';
import { accent, dim, error, header, label, warning } from '../theme.js';

/** Extra spacing added after the longest cell content in each column. */
const COLUMN_GAP = 2;

const PRESENT_SYMBOL = '✓';
const MISSING_SYMBOL = '✗';
const MISMATCH_SYMBOL = '≠';

/**
 * Prints a key-by-file presence matrix to the terminal, showing which
 * files define each key (and which differ in value, when checked).
 * @param result The computed matrix result.
 * @param checkValues Whether value mismatches were checked across files.
 * @param showStats Whether to print a trailing summary line.
 * @returns void
 */
export function printMatrixTable(
  result: MatrixResult,
  checkValues: boolean,
  showStats: boolean,
): void {
  const keyWidth =
    Math.max(3, ...result.rows.map((r) => r.key.length)) + COLUMN_GAP;
  const colWidths = result.files.map(
    (name) => Math.max(name.length, PRESENT_SYMBOL.length) + COLUMN_GAP,
  );
  const tableDivider = dim(
    '─'.repeat(keyWidth + colWidths.reduce((sum, w) => sum + w, 0)),
  );

  console.log();
  console.log(
    header('KEY'.padEnd(keyWidth)) +
      result.files
        .map((name, i) => header(name.padEnd(colWidths[i]!)))
        .join(''),
  );
  console.log(tableDivider);

  for (const row of result.rows) {
    const cells = row.presence
      .map((present, i) =>
        formatCell(present, row.hasMismatch, checkValues, colWidths[i]!),
      )
      .join('');
    console.log(`${label(row.key.padEnd(keyWidth))}${cells}`);
  }

  console.log(tableDivider);

  if (showStats) {
    printSummary(result);
  }
}

/**
 * Formats a single matrix cell, padding the plain symbol before colorizing
 * it so ANSI escape codes never affect column alignment.
 * @param present Whether the file defines this key.
 * @param hasMismatch Whether this row has a value mismatch across files.
 * @param checkValues Whether value mismatches are being checked.
 * @param width The column width to pad to.
 * @returns The colorized, padded cell string.
 */
function formatCell(
  present: boolean,
  hasMismatch: boolean,
  checkValues: boolean,
  width: number,
): string {
  if (!present) return error(MISSING_SYMBOL.padEnd(width));
  if (checkValues && hasMismatch) return warning(MISMATCH_SYMBOL.padEnd(width));
  return accent(PRESENT_SYMBOL.padEnd(width));
}

/**
 * Prints a one-line summary of how many keys differ across the compared files.
 * @param result The computed matrix result.
 * @returns void
 */
function printSummary(result: MatrixResult): void {
  const diffCount = result.rows.filter(
    (r) => !r.presence.every(Boolean) || r.hasMismatch,
  ).length;

  console.log(
    dim(
      `${result.files.length} files, ${result.rows.length} keys, ${diffCount} difference${diffCount === 1 ? '' : 's'}`,
    ),
  );
}
