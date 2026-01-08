/** Normalizes file paths to use forward slashes for cross-platform consistency.
 * @param file - The file path to normalize.
 * @returns The normalized file path.
 */
export function normalizePath(file: string) {
  return file.replace(/\\/g, '/');
}
