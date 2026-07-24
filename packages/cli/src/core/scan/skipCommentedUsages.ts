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
 * @param usages - List of environment variable usages
 * @returns Filtered list of environment variable usages
 */
export function skipCommentedUsages(usages: readonly EnvUsage[]): EnvUsage[] {
  let insideHtmlComment = false;
  let insideIgnoreBlock = false;

  return usages.filter((u) => {
    if (!u.context) return true;
    const line = u.context.trim();

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*start\s*-->/i.test(line)) {
      insideIgnoreBlock = true;
      return false;
    }

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*end\s*-->/i.test(line)) {
      insideIgnoreBlock = false;
      return false;
    }

    // Short-circuit before any HTML-comment bookkeeping: a stray `<!--`/`-->`
    // on a line inside an ignore block must not leak into `insideHtmlComment`
    // and drop live usages after the block ends.
    if (insideIgnoreBlock) return false;

    // HTML comment span tracking. Markers are only honoured at the *start* of
    // the trimmed line — i.e. a genuine comment line — so `<!--`/`-->` embedded
    // in code or string literals (e.g. `while (i --> 0)` or a `"<!--"` literal)
    // never fake a comment and silently drop a real usage.
    if (insideHtmlComment) {
      // Somewhere inside a multi-line HTML comment: this usage is commented
      // out. A comment terminator anywhere on the line closes the comment.
      if (HTML_COMMENT_END.test(line)) insideHtmlComment = false;
      return false;
    }

    if (line.startsWith('<!--')) {
      // Opens an HTML comment. Unless it also closes on the same line, the
      // comment continues onto the following usages.
      if (!HTML_COMMENT_END.test(line)) insideHtmlComment = true;
      return false;
    }

    return !COMMENT_LINE_PREFIX.test(line) && !hasIgnoreComment(line);
  });
}
