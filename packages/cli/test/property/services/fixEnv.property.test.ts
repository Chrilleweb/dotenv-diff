import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { applyFixes } from '../../../src/services/fixEnv.js';

/**
 * Property-based ("fuzz") tests for the .env auto-fixer.
 *
 * `applyFixes` rewrites a file in place: it strips duplicate keys (keeping the
 * last occurrence) and appends missing keys, preserving the file's line-ending
 * style. File-mutating line surgery is where data-loss bugs hide, so these feed
 * thousands of random .env bodies (LF and CRLF, comments, blanks, junk, keys
 * with `.`/`-`) through it and check the result against an independent oracle:
 * duplicate removal is a faithful subsequence that keeps exactly the last
 * occurrence and touches nothing else, appending is a pure suffix, EOL style is
 * preserved, and both operations are idempotent. Property-based testing is also
 * what OpenSSF Scorecard recognises as fuzzing for JS/TS.
 */

// Same key-detection regex the fixer uses, so "key" means the same thing here.
const KEY_RE = /^\s*([\w.-]+)\s*=/;
const parseKey = (line: string): string | null =>
  line.match(KEY_RE)?.[1] ?? null;

// Mirror of detectEol: CRLF if the text contains one anywhere, else LF.
const usedEol = (text: string): string =>
  text.includes('\r\n') ? '\r\n' : '\n';

let dir: string;
let envPath: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixenv-prop-'));
  envPath = path.join(dir, '.env');
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function runDedup(content: string, duplicateKeys: string[]): string {
  fs.writeFileSync(envPath, content);
  applyFixes({ envPath, missingKeys: [], duplicateKeys });
  return fs.readFileSync(envPath, 'utf-8');
}

function runAdd(content: string, missingKeys: string[]): string {
  fs.writeFileSync(envPath, content);
  applyFixes({ envPath, missingKeys, duplicateKeys: [] });
  return fs.readFileSync(envPath, 'utf-8');
}

// ---- generators ----

// Keys span the fixer's full `[\w.-]` charset, with optional leading whitespace.
const keyName = fc.stringMatching(/^[A-Za-z_][A-Za-z0-9_.-]{0,6}$/);
const valuePart = fc.stringMatching(/^[^\r\n]{0,8}$/);
const indent = fc.stringMatching(/^[ \t]{0,3}$/);
const kvLine = fc
  .tuple(indent, keyName, valuePart)
  .map(([ws, k, v]) => `${ws}${k}=${v}`);
const otherLine = fc.oneof(
  fc.constant(''),
  fc.stringMatching(/^#[^\r\n]{0,10}$/),
  fc.stringMatching(/^[^\r\n=]{1,10}$/),
);
const anyLine = fc.oneof(kvLine, kvLine, otherLine);

const body = fc
  .tuple(fc.array(anyLine, { maxLength: 15 }), fc.constantFrom('\n', '\r\n'))
  .map(([lines, eol]) => lines.join(eol));

/** Oracle: keep every line except non-last occurrences of a duplicate-set key. */
function expectedDedup(text: string, duplicateKeys: string[]): string[] {
  const eol = usedEol(text);
  const lines = text.split(eol);
  const dupSet = new Set(duplicateKeys);
  const lastIndexOfKey = new Map<string, number>();
  lines.forEach((l, i) => {
    const k = parseKey(l);
    if (k !== null && dupSet.has(k)) lastIndexOfKey.set(k, i);
  });
  return lines.filter((l, i) => {
    const k = parseKey(l);
    if (k !== null && dupSet.has(k)) return lastIndexOfKey.get(k) === i;
    return true;
  });
}

describe('applyFixes — duplicate removal (property-based)', () => {
  test('never throws on arbitrary bodies and duplicate lists', () => {
    fc.assert(
      fc.property(body, fc.array(keyName, { maxLength: 6 }), (text, dups) => {
        runDedup(text, dups);
      }),
      { numRuns: 800 },
    );
  });

  test('result matches the keep-last-occurrence oracle exactly', () => {
    fc.assert(
      fc.property(body, fc.array(keyName, { maxLength: 6 }), (text, dups) => {
        const eol = usedEol(text);
        const result = runDedup(text, dups);
        expect(result.split(eol)).toEqual(expectedDedup(text, dups));
      }),
      { numRuns: 1500 },
    );
  });

  test('lines whose key is not a duplicate are preserved verbatim and in order', () => {
    fc.assert(
      fc.property(body, fc.array(keyName, { maxLength: 6 }), (text, dups) => {
        const eol = usedEol(text);
        const dupSet = new Set(dups);
        const untouched = (l: string) => {
          const k = parseKey(l);
          return k === null || !dupSet.has(k);
        };
        const before = text.split(eol).filter(untouched);
        const after = runDedup(text, dups).split(eol).filter(untouched);
        expect(after).toEqual(before);
      }),
      { numRuns: 1500 },
    );
  });

  test('each duplicate-set key appears at most once afterwards', () => {
    fc.assert(
      fc.property(body, fc.array(keyName, { maxLength: 6 }), (text, dups) => {
        const eol = usedEol(text);
        const result = runDedup(text, dups);
        const counts = new Map<string, number>();
        for (const l of result.split(eol)) {
          const k = parseKey(l);
          if (k !== null) counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        for (const k of new Set(dups)) {
          expect(counts.get(k) ?? 0).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 1500 },
    );
  });

  test('duplicate removal is idempotent and preserves EOL style', () => {
    fc.assert(
      fc.property(body, fc.array(keyName, { maxLength: 6 }), (text, dups) => {
        const once = runDedup(text, dups);
        const twice = runDedup(once, dups);
        expect(twice).toBe(once);
        if (text.includes('\r\n')) {
          // A CRLF file never gains a bare LF from the rewrite.
          expect(/(?<!\r)\n/.test(once)).toBe(false);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe('applyFixes — missing key append (property-based)', () => {
  test('never throws on arbitrary bodies and key lists', () => {
    fc.assert(
      fc.property(body, fc.array(keyName, { maxLength: 6 }), (text, keys) => {
        runAdd(text, keys);
      }),
      { numRuns: 800 },
    );
  });

  test('appends exactly the missing keys as a pure suffix, keeping the original', () => {
    fc.assert(
      fc.property(
        body,
        fc.array(keyName, { minLength: 1, maxLength: 6 }),
        (text, keys) => {
          const eol = usedEol(text);
          const result = runAdd(text, keys);
          // The original content is preserved untouched as a prefix.
          expect(result.startsWith(text)).toBe(true);
          const separator = text.length > 0 && !text.endsWith('\n') ? eol : '';
          const expectedSuffix =
            separator + keys.map((k) => `${k}=`).join(eol) + eol;
          expect(result.slice(text.length)).toBe(expectedSuffix);
        },
      ),
      { numRuns: 1500 },
    );
  });

  test('the result always ends with a newline', () => {
    fc.assert(
      fc.property(
        body,
        fc.array(keyName, { minLength: 1, maxLength: 6 }),
        (text, keys) => {
          expect(runAdd(text, keys).endsWith('\n')).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  test('an empty missing-key list leaves the file byte-for-byte unchanged', () => {
    fc.assert(
      fc.property(body, (text) => {
        expect(runAdd(text, [])).toBe(text);
      }),
      { numRuns: 1000 },
    );
  });
});
