import chalk from 'chalk';

export const dim = chalk.hex('#555555');
export const label = chalk.hex('#888888');
export const value = chalk.hex('#e0e0e0').bold;
export const accent = chalk.hex('#00d4aa');
export const warning = chalk.hex('#ffae42');
export const error = chalk.hex('#ff4d4d');
export const divider = dim('─'.repeat(50));
export const header = chalk.white.bold;

/**
 * This is the maximum line length for reason text in warnings.
 * If a reason exceeds this length, it will be wrapped to the next line with indentation.
 */
const REASON_MAX = 24;

/**
 * Wraps framework warning reasons to a max line length, indenting wrapped lines to align with the start of the reason text.
 * @param reason The warning reason text to wrap
 * @param indent The number of spaces to indent wrapped lines (should align with the start of the reason text in the output)
 * @returns The wrapped reason text with newlines and indentation as needed
 */
export function wrapReason(reason: string, indent: number): string {
  if (reason.length <= REASON_MAX) return reason;
  const pad = ' '.repeat(indent);
  const words = reason.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + word).length > REASON_MAX) {
      lines.push(current.trimEnd());
      current = word + ' ';
    } else {
      current += word + ' ';
    }
  }
  if (current.trim()) lines.push(current.trimEnd());
  return lines.join(`\n${pad}`);
}
