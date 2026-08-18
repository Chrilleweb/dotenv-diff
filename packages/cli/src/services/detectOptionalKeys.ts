import fs from 'fs';
import { splitEnvLines } from '../core/envLine.js';
import { ENV_KEY_LINE } from '../config/constants.js';

/**
 * Matches an `@optional` annotation line in any of its accepted forms:
 * `# @optional`, `// @optional`, `# optional`, or a bare `@optional`.
 * Mirrors the `@expire` annotation styles so there is only one convention to learn.
 */
const OPTIONAL_ANNOTATION = /^(?:\/\/|#)?\s*@?optional\s*$/i;

/**
 * Detects keys marked `@optional` in a dotenv file.
 *
 * An optional key does not have to be set: the code is expected to cope with it
 * being absent, so it is not reported as missing.
 *
 * Follows the same block rules as `@expire`:
 *  - `#` or `//` prefixes, and the `@` is optional
 *  - the annotation applies to the **next key only**
 *  - a comment line between the annotation and the key is fine
 *  - a **blank line ends the block**, so the annotation cannot leak across a gap
 *    onto an unrelated key further down
 *
 * fx:
 *
 * # Optional in local dev — falls back to an in-memory store
 * # @optional
 * REDIS_URL=
 *
 * An unreadable or absent file yields no keys. That fails safe: without
 * annotations every key stays required, so a read error can only make reporting
 * stricter, never let a real problem through.
 * @param filePath - Path to the dotenv file (normally `.env.example`)
 * @returns Array<string> of the keys marked optional
 */
export function detectOptionalKeys(filePath: string): string[] {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = splitEnvLines(content);

  const optional: string[] = [];
  let pendingOptional = false;

  for (const raw of lines) {
    const line = raw.trim();

    // A blank line ends the current annotation block. Comments are carried over
    // (an `@optional` may sit above a documented key), but an empty line signals
    // "end of block" so a pending annotation cannot attach itself to an
    // unrelated key further down the file.
    if (line === '') {
      pendingOptional = false;
      continue;
    }

    if (OPTIONAL_ANNOTATION.test(line)) {
      pendingOptional = true;
      continue;
    }

    if (!ENV_KEY_LINE.test(line)) continue;

    const key = line.split('=')[0]!.trim();

    if (pendingOptional) {
      optional.push(key);
      pendingOptional = false;
    }
  }

  return optional;
}
