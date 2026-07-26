import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectMissingComments } from '../../../src/services/detectMissingComments.js';
import { parseEnvLine, splitEnvLines } from '../../../src/core/envLine.js';

/**
 * Property-based ("fuzz") tests for the undocumented-key detector.
 *
 * A key is "documented" when a `#` comment sits directly above it or inline
 * after its value; anything else is reported. These feed thousands of random
 * `.env.example` bodies through the detector and check it against an independent
 * oracle: it never throws, only reports real keys, never reports a key that has
 * a comment above or inline, and reports every key that has neither. Property-
 * based testing is also what OpenSSF Scorecard recognises as fuzzing for JS/TS.
 */

let dir: string;
let filePath: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comments-prop-'));
  filePath = path.join(dir, '.env.example');
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function run(content: string) {
  fs.writeFileSync(filePath, content);
  return detectMissingComments(filePath);
}

/** Independent re-derivation of the documented/undocumented rule. */
function oracle(content: string): { key: string; line: number }[] {
  const lines = splitEnvLines(content);
  const out: { key: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseEnvLine(lines[i]!);
    if (!parsed) continue;
    const eq = lines[i]!.indexOf('=');
    const inline = eq !== -1 && lines[i]!.slice(eq + 1).includes('#');
    const above = i > 0 && lines[i - 1]!.trim().startsWith('#');
    if (!inline && !above) out.push({ key: parsed.key, line: i + 1 });
  }
  return out;
}

const keyName = fc.stringMatching(/^[A-Z_][A-Z0-9_]{0,6}$/);
const value = fc.stringMatching(/^[^\r\n#]{0,6}$/);
const lineArb = fc.oneof(
  keyName.map((k) => `${k}=`), // bare key (undocumented unless comment above)
  fc.tuple(keyName, value).map(([k, v]) => `${k}=${v}`),
  fc.tuple(keyName, value).map(([k, v]) => `${k}=${v} # inline doc`), // inline
  fc.stringMatching(/^# [^\r\n]{0,12}$/), // comment line
  fc.constant(''), // blank
  fc.stringMatching(/^[^\r\n=#]{0,8}$/), // junk (no key)
);

const bodyArb = fc
  .tuple(fc.array(lineArb, { maxLength: 18 }), fc.constantFrom('\n', '\r\n'))
  .map(([lines, eol]) => lines.join(eol));

describe('detectMissingComments (property-based)', () => {
  test('never throws on arbitrary file content', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (content) => {
        run(content);
      }),
      { numRuns: 1000 },
    );
  });

  test('matches the documented/undocumented oracle exactly', () => {
    fc.assert(
      fc.property(bodyArb, (content) => {
        expect(run(content)).toEqual(oracle(content));
      }),
      { numRuns: 2000 },
    );
  });

  test('every reported entry is a real key at the reported line', () => {
    fc.assert(
      fc.property(bodyArb, (content) => {
        const lines = splitEnvLines(content);
        for (const w of run(content)) {
          const parsed = parseEnvLine(lines[w.line - 1]!);
          expect(parsed?.key).toBe(w.key);
        }
      }),
      { numRuns: 2000 },
    );
  });

  test('a key with a comment directly above is never reported', () => {
    fc.assert(
      fc.property(keyName, value, (k, v) => {
        expect(run(`# documented\n${k}=${v}`)).toEqual([]);
      }),
      { numRuns: 1000 },
    );
  });

  test('a key with an inline comment is never reported', () => {
    fc.assert(
      fc.property(keyName, value, (k, v) => {
        expect(run(`${k}=${v} # inline`)).toEqual([]);
      }),
      { numRuns: 1000 },
    );
  });

  test('a bare undocumented key is always reported', () => {
    fc.assert(
      fc.property(keyName, value, (k, v) => {
        // Preceded by a blank line so there is no comment above.
        const result = run(`\n${k}=${v}`);
        expect(result).toEqual([{ key: k, line: 2 }]);
      }),
      { numRuns: 1000 },
    );
  });
});
