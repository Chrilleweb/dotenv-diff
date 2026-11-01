/** Start marker of an ignore block, in any comment syntax. */
const IGNORE_START = /dotenv[\s-]*diff[\s-]*ignore[\s-]*start/i;

/** End marker of an ignore block, in any comment syntax. */
const IGNORE_END = /dotenv[\s-]*diff[\s-]*ignore[\s-]*end/i;

/**
 * Matches an HTML comment terminator anywhere on a line. Per the WHATWG spec a
 * comment closes with `-->` or the "abrupt closing" form `--!>`, so both count.
 */
const HTML_COMMENT_END = /--!?>/;

/** Matches a block comment terminator anywhere on a line. */
const BLOCK_COMMENT_END = /\*\//;

/** Anchored single-line comment prefixes: `//`, `#`, `*`, or a closing `-->`/`--!>`. */
const COMMENT_LINE_PREFIX = /^(\/\/|#|\*|--!?>)/;

/**
 * Checks if a line has an ignore comment
 * fx: // dotenv-diff-ignore or /* dotenv-diff-ignore *\/ or <!-- dotenv-diff-ignore -->
 * @param line - The line to check
 * @returns True if the line should be ignored
 */
export function hasIgnoreComment(line: string): boolean {
  const normalized = line.trim();

  // Cheap linear pre-check: the directive token must appear at all. This short
  // circuits pathological lines (e.g. long runs of "/") before they reach the
  // comment-marker regexes below, whose unbounded `.*` would otherwise rescan
  // from every marker position and go quadratic (O(n²)) on the line length.
  if (!/dotenv[\s-]*diff[\s-]*ignore/i.test(normalized)) return false;

  // Allow mixed casing, extra spaces, and optional dashes
  return (
    /\/\/.*dotenv[\s-]*diff[\s-]*ignore/i.test(normalized) ||
    /\/\*.*dotenv[\s-]*diff[\s-]*ignore.*\*\//i.test(normalized) ||
    /<!--.*dotenv[\s-]*diff[\s-]*ignore.*-->/i.test(normalized) ||
    /\bdotenv[\s-]*diff[\s-]*ignore\b/i.test(normalized)
  );
}

/**
 * Finds the lines inside `dotenv-diff-ignore-start` / `-end` blocks, including
 * the marker lines themselves. Markers work in any comment syntax:
 *   <!-- dotenv-diff-ignore-start -->
 *   // dotenv-diff-ignore-start
 *   /* dotenv-diff-ignore-start *\/
 * A start marker without a matching end ignores the rest of the file.
 * @param lines - The lines of a file
 * @returns 0-based indexes of the ignored lines
 */
export function findIgnoreBlockLines(lines: readonly string[]): Set<number> {
  const ignored = new Set<number>();
  let insideBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (insideBlock) {
      ignored.add(i);
      if (IGNORE_END.test(line)) insideBlock = false;
    } else if (IGNORE_START.test(line)) {
      ignored.add(i);
      insideBlock = true;
    }
  }

  return ignored;
}

/**
 * Finds the lines whose env usages should be skipped:
 *  - lines inside ignore blocks (see {@link findIgnoreBlockLines})
 *  - lines inside multi-line `/* ... *\/` and `<!-- ... -->` comments
 *  - single-line comments: `//`, `#`, `*`, `/* ... *\/`, `<!-- ... -->`
 *  - lines with a `dotenv-diff-ignore` comment, and the line right after it
 *
 * A multi-line comment only counts when it opens at the *start* of a line, so
 * `/*` or `<!--` inside code or strings (e.g. `const s = "<!--"`) never hides
 * real usages on the following lines.
 * @param lines - The lines of a file
 * @returns 0-based indexes of the commented lines
 */
export function findCommentedLines(lines: readonly string[]): Set<number> {
  const ignoreBlockLines = findIgnoreBlockLines(lines);
  const commented = new Set(ignoreBlockLines);
  let insideBlockComment = false;
  let insideHtmlComment = false;

  for (let i = 0; i < lines.length; i++) {
    // Comment markers inside an ignore block are ignored too
    if (ignoreBlockLines.has(i)) continue;

    const line = lines[i]!.trim();

    if (insideBlockComment) {
      commented.add(i);
      if (BLOCK_COMMENT_END.test(line)) insideBlockComment = false;
    } else if (insideHtmlComment) {
      commented.add(i);
      if (HTML_COMMENT_END.test(line)) insideHtmlComment = false;
    } else if (line.startsWith('/*')) {
      commented.add(i);
      // Skip the opening `/*` so `/*/` is not mistaken for a terminator
      if (!BLOCK_COMMENT_END.test(line.slice(2))) insideBlockComment = true;
    } else if (line.startsWith('<!--')) {
      commented.add(i);
      if (!HTML_COMMENT_END.test(line)) insideHtmlComment = true;
    } else if (COMMENT_LINE_PREFIX.test(line)) {
      commented.add(i);
    }

    // A `dotenv-diff-ignore` comment covers its own line and the next one
    if (hasIgnoreComment(line)) {
      commented.add(i);
      if (i + 1 < lines.length) commented.add(i + 1);
    }
  }

  return commented;
}
