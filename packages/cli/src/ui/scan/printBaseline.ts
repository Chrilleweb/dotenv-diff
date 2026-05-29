import path from 'path';
import { normalizePath } from '../../core/helpers/normalizePath.js';
import {
  accent,
  error,
  label,
  divider,
  header,
  padLabel,
  dim,
} from '../theme.js';

/**
 * Prints the result of writing a baseline file to the console.
 * @param entryCount The number of entries written to the baseline
 * @param filePath The absolute path to the baseline file that was written
 * @returns void
 */
export function printBaselineWritten(
  entryCount: number,
  filePath: string,
): void {
  const fileName = normalizePath(path.basename(filePath));
  console.log();
  console.log(`${accent('▸')} ${header('Baseline saved')}`);
  console.log(`${divider}`);
  console.log(`${label(padLabel('File'))}${accent(fileName)}`);
  console.log(
    `${label(padLabel('Warnings stored'))}${accent(String(entryCount))}`,
  );
  console.log(`${divider}`);
  console.log(
    dim(
      'Future runs will suppress these issues. Delete the file or remove entries to re-surface them.',
    ),
  );
}

/**
 * Prints an error that occurred while writing the baseline file.
 * @param message The error message to print
 * @returns void
 */
export function printBaselineError(message: string): void {
  console.log();
  console.log(`${error('▸')} ${header('Baseline error')}`);
  console.log(`${divider}`);
  console.log(`${label(padLabel('Error'))}${error(message)}`);
  console.log(`${divider}`);
}
