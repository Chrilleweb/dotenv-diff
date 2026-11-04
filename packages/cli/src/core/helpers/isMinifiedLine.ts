/** Lines longer than this are treated as minified / bundled code */
export const MINIFIED_LINE_LENGTH = 500;

/**
 * Returns true if a single line looks like minified/bundled code.
 * Used to skip individual lines before matching, so a long line (e.g. an
 * inline SVG or base64 data URL) is ignored without skipping its whole file.
 * @param line - A single line of source code
 * @returns Boolean whether the line is likely minified
 */
export function isMinifiedLine(line: string): boolean {
  return line.length > MINIFIED_LINE_LENGTH;
}
