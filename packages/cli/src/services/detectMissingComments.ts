import fs from 'fs';
import type { CommentWarning } from '../config/types.js';
import { splitEnvLines, parseEnvLine } from '../core/envLine.js';

/**
 * A line that is *only* an `@expire` annotation, in any of its accepted forms:
 * `# @expire 2025-12-12`, `// @expire 2025-12-12`, `# expire 2025-12-12`, or a
 * bare `@expire 2025-12-12`. This is a machine annotation, not human
 * documentation, so it never satisfies the "documented" rule on its own — but
 * it is transparent: a real comment sitting above it still documents the key.
 */
const BARE_EXPIRE_ANNOTATION =
  /^(?:\/\/|#)?\s*@?expire\s+\d{4}-\d{2}-\d{2}\s*$/i;

/**
 * Detects `.env.example` keys that lack a documenting comment.
 *
 * A key counts as documented when either:
 *  - its own line has an inline comment after the value (`KEY=value # ...`), or
 *  - a real `#` comment sits in the contiguous run of comment/annotation lines
 *    directly above it. `@expire` annotation lines are transparent (they do not
 *    themselves document, but they don't hide a real comment above them either);
 *    a blank line or a non-comment line ends the run.
 *
 * Everything else (a bare `KEY=` with no neighbouring comment) is reported.
 * fx:
 *
 *   # Stripe webhook signing secret
 *   STRIPE_WEBHOOK_SECRET=      ← documented (comment above)
 *   # Rotated quarterly
 *   # @expire 2026-12-31
 *   ROTATING_KEY=              ← documented (comment above the annotation)
 *   PORT=3000 # server port     ← documented (inline comment)
 *   # @expire 2026-12-31
 *   API_KEY=                    ← reported (only an annotation above, no prose)
 *
 * @param filePath - Path to the `.env.example` file to inspect.
 * @returns One warning per undocumented key, in file order.
 */
export function detectMissingComments(filePath: string): CommentWarning[] {
  const lines = splitEnvLines(fs.readFileSync(filePath, 'utf8'));
  const warnings: CommentWarning[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const parsed = parseEnvLine(line);
    if (!parsed) continue; // blank line, comment line, or non-key line

    // Inline comment: a `#` anywhere after the first `=`.
    const eq = line.indexOf('=');
    const hasInlineComment = eq !== -1 && line.slice(eq + 1).includes('#');

    // Comment above: walk up through the contiguous run of lines directly above
    // the key. `@expire` annotations are skipped over (transparent); the first
    // real `#` comment documents the key. A blank line or any non-comment line
    // ends the run — the comment then belongs to something else, not this key.
    let hasCommentAbove = false;
    for (let j = i - 1; j >= 0; j--) {
      const above = lines[j]!.trim();
      if (above === '') break; // blank line ends the block
      if (BARE_EXPIRE_ANNOTATION.test(above)) continue; // transparent annotation
      if (above.startsWith('#')) {
        hasCommentAbove = true; // a real, prose comment
      }
      break; // real comment or a non-comment line (e.g. another key) ends the run
    }

    if (!hasInlineComment && !hasCommentAbove) {
      warnings.push({ key: parsed.key, line: i + 1 });
    }
  }

  return warnings;
}
