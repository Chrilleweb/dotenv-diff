import type { EnvUsage } from '../../config/types.js';
import { hasIgnoreComment } from '../../core/security/secretDetectors.js';

/**
 * Matches an HTML comment terminator anywhere on a line. Per the WHATWG spec a
 * comment closes with `-->` or the "abrupt closing" form `--!>`, so both count.
 */
const HTML_COMMENT_END = /--!?>/;

/** Anchored comment-line prefixes: `//`, `#`, `/*`, `*`, or a closing `-->`/`--!>`. */
const COMMENT_LINE_PREFIX = /^(\/\/|#|\/\*|\*|--!?>)/;

/**
 * Filters out commented usages from the list.
 * Skipping comments:
 *   // process.env.API_URL
 *   # process.env.API_URL
 *   /* process.env.API_URL
 *   * process.env.API_URL
 *   <!-- process.env.API_URL -->
 *
 * Comment state is tracked per file, so an unclosed comment in one file never
 * hides usages in another. The returned usages keep their original order.
 * @param usages - List of environment variable usages
 * @returns Filtered list of environment variable usages
 */
export function skipCommentedUsages(usages: readonly EnvUsage[]): EnvUsage[] {
  const commented = new Set<EnvUsage>();

  for (const fileUsages of groupByFile(usages).values()) {
    for (const u of findCommentedUsages(fileUsages)) commented.add(u);
  }

  return usages.filter((u) => !commented.has(u));
}

/**
 * Groups usages by the file they were found in.
 * @param usages - List of environment variable usages
 * @returns Map from file path to the usages found in that file
 */
function groupByFile(usages: readonly EnvUsage[]): Map<string, EnvUsage[]> {
  const byFile = new Map<string, EnvUsage[]>();
  for (const u of usages) {
    const fileUsages = byFile.get(u.file);
    if (fileUsages) fileUsages.push(u);
    else byFile.set(u.file, [u]);
  }
  return byFile;
}

/**
 * Finds the commented usages within a single file.
 * Usages are walked in line order, since the scanner returns them grouped by
 * pattern and multi-line comment tracking depends on the order of the lines.
 * @param fileUsages - Usages found in one file
 * @returns The usages that are commented out or ignored
 */
function findCommentedUsages(fileUsages: readonly EnvUsage[]): EnvUsage[] {
  const byLine = [...fileUsages].sort((a, b) => a.line - b.line);

  let insideHtmlComment = false;
  let insideIgnoreBlock = false;

  return byLine.filter((u) => {
    if (!u.context) return false;
    const line = u.context.trim();

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*start\s*-->/i.test(line)) {
      insideIgnoreBlock = true;
      return true;
    }

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*end\s*-->/i.test(line)) {
      insideIgnoreBlock = false;
      return true;
    }

    // Short-circuit before any HTML-comment bookkeeping: a stray `<!--`/`-->`
    // on a line inside an ignore block must not leak into `insideHtmlComment`
    // and drop live usages after the block ends.
    if (insideIgnoreBlock) return true;

    // HTML comment span tracking. Markers are only honoured at the *start* of
    // the trimmed line — i.e. a genuine comment line — so `<!--`/`-->` embedded
    // in code or string literals (e.g. `while (i --> 0)` or a `"<!--"` literal)
    // never fake a comment and silently drop a real usage.
    if (insideHtmlComment) {
      // Somewhere inside a multi-line HTML comment: this usage is commented
      // out. A comment terminator anywhere on the line closes the comment.
      if (HTML_COMMENT_END.test(line)) insideHtmlComment = false;
      return true;
    }

    if (line.startsWith('<!--')) {
      // Opens an HTML comment. Unless it also closes on the same line, the
      // comment continues onto the following usages.
      if (!HTML_COMMENT_END.test(line)) insideHtmlComment = true;
      return true;
    }

    return COMMENT_LINE_PREFIX.test(line) || hasIgnoreComment(line);
  });
}
