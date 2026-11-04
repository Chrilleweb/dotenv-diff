/** File names produced by minifiers and bundlers, e.g. `app.min.js` */
const MINIFIED_FILE_NAME = /\.(?:min|bundle)\.[a-z]+$/i;

/**
 * Files smaller than this are always scanned. Skipping a file is only a
 * performance shortcut, since long lines are skipped one by one anyway, and
 * small files are cheap to scan.
 */
const MIN_MINIFIED_FILE_SIZE = 50_000;

/** Average line length above which a large file is treated as a bundle */
const MINIFIED_AVG_LINE_LENGTH = 200;

/**
 * Returns true if a whole file looks like minified/bundled code.
 * Used to skip entire files early in the pipeline.
 *
 * A single long line is not enough: a normal source file with an inline SVG
 * or a base64 data URL must still be scanned. Instead the file must either
 * carry a minified file name or be large with a high average line length.
 * @param filePath - Path of the file, used to recognise minified file names
 * @param content - The content of the file to check
 * @returns Boolean whether the file is likely minified
 */
export function isMinifiedFile(filePath: string, content: string): boolean {
  if (MINIFIED_FILE_NAME.test(filePath)) return true;
  if (content.length < MIN_MINIFIED_FILE_SIZE) return false;

  // Counting newlines avoids allocating an array of every line
  let lineCount = 1;
  for (
    let i = content.indexOf('\n');
    i !== -1;
    i = content.indexOf('\n', i + 1)
  ) {
    lineCount++;
  }

  return content.length / lineCount > MINIFIED_AVG_LINE_LENGTH;
}
