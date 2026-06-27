import { accent, divider, header } from '../theme.js';

/**
 * Prints the header line for matrix comparison output.
 * @param files The display names of the files being compared.
 * @returns void
 */
export function printMatrixHeader(files: string[]): void {
  console.log();
  console.log(
    `${accent('▸')} ${header(`Matrix comparison: ${files.join(' ↔ ')}`)}`,
  );
  console.log(`${divider}`);
}
