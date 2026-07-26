import fs from 'fs';
import type { CommentWarning } from '../config/types.js';
import { splitEnvLines, parseEnvLine } from '../core/envLine.js';

/**
 * Detects `.env.example` keys that lack a documenting comment.
 *
 * A key counts as documented when either:
 *  - the line directly above it is a `#` comment, or
 *  - the key's own line has an inline comment after the value (`KEY=value # ...`).
 *
 * Everything else (a bare `KEY=` with no neighbouring comment) is reported.
 * fx:
 *
 *   # Stripe webhook signing secret
 *   STRIPE_WEBHOOK_SECRET=      ← documented (comment above)
 *   PORT=3000 # server port     ← documented (inline comment)
 *   API_KEY=                    ← reported (undocumented)
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

    // Comment directly above: the immediately preceding line is a `#` comment.
    const prev = i > 0 ? lines[i - 1]!.trim() : '';
    const hasCommentAbove = prev.startsWith('#');

    if (!hasInlineComment && !hasCommentAbove) {
      warnings.push({ key: parsed.key, line: i + 1 });
    }
  }

  return warnings;
}
