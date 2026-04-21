/**
 * Returns true if a line looks like minified/bundled code.
 * Used to skip entire files early in the pipeline.
 * @param content - The content of the file to check
 * @returns Boolean whether the content is likely minified
 */
export function isLikelyMinified(content: string): boolean {
  return content.split(/\r?\n/).some((line) => line.length > 500);
}
