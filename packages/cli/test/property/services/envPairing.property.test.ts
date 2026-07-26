import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { envPairing } from '../../../src/services/envPairing.js';
import {
  DEFAULT_ENV_FILE,
  DEFAULT_EXAMPLE_FILE,
} from '../../../src/config/constants.js';
import type { Discovery } from '../../../src/config/types.js';

/**
 * Property-based ("fuzz") tests for envPairing.
 *
 * envPairing resolves each discovered env file to the example file it should be
 * compared against. Its output is fully determined by the Discovery input plus
 * which example files exist on disk, so these tests feed thousands of random
 * discoveries through it and check implementation-independent invariants: it
 * never throws, it preserves the input list order, every path it emits is an
 * absolute resolution of a name from the input, and the two flag-driven modes
 * (example-only vs. per-file resolution) behave exactly as specified. Property-
 * based testing is also what OpenSSF Scorecard recognises as fuzzing for JS/TS.
 */

let root: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'envpairing-prop-'));
});
afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

/** A fresh, empty working directory for one property run. */
function freshCwd(): string {
  return fs.mkdtempSync(path.join(root, 'run-'));
}

/** Independent re-derivation of the example name envPairing picks per env file. */
function expectedExampleName(envName: string, primaryExample: string): string {
  const suffix =
    envName === DEFAULT_ENV_FILE ? '' : envName.replace(DEFAULT_ENV_FILE, '');
  return suffix ? `${DEFAULT_EXAMPLE_FILE}${suffix}` : primaryExample;
}

/** Safe file names: no path separators, no `.`/`..`, resolvable by path.resolve. */
const suffixArb = fc.stringMatching(/^[a-z]{1,8}$/);
const envNameArb = fc.oneof(
  { weight: 3, arbitrary: fc.constant(DEFAULT_ENV_FILE) },
  { weight: 3, arbitrary: suffixArb.map((s) => `${DEFAULT_ENV_FILE}.${s}`) },
  { weight: 1, arbitrary: fc.constant(DEFAULT_EXAMPLE_FILE) },
  { weight: 1, arbitrary: fc.stringMatching(/^[a-z][a-z0-9._-]{0,10}$/) },
);
const primaryExampleArb = fc.oneof(
  fc.constant(DEFAULT_EXAMPLE_FILE),
  suffixArb.map((s) => `${DEFAULT_EXAMPLE_FILE}.${s}`),
  fc.constant('.env.template'),
);
// Flags only matter as truthy/falsy; include null and non-empty strings.
const flagArb = fc.option(fc.string({ minLength: 1 }), { nil: null });

/** A Discovery with a real, empty cwd assigned by the caller. */
const discoveryArb = (cwd: string): fc.Arbitrary<Discovery> =>
  fc.record({
    cwd: fc.constant(cwd),
    envFiles: fc.array(envNameArb, { maxLength: 6 }),
    primaryEnv: envNameArb,
    primaryExample: primaryExampleArb,
    envFlag: flagArb,
    exampleFlag: flagArb,
    alreadyWarnedMissingEnv: fc.boolean(),
  });

/** The effective iteration list, mirroring envPairing's own fallback. */
function effectiveList(d: Discovery): string[] {
  return d.envFiles.length > 0 ? d.envFiles : [d.primaryEnv];
}

/** True when envPairing runs in "example flag pinned, no env flag" mode. */
function isExampleOnly(d: Discovery): boolean {
  return Boolean(d.exampleFlag) && !d.envFlag;
}

/** result.map(envName) must be a subsequence of `list` (order preserved). */
function isSubsequence(sub: string[], list: string[]): boolean {
  let i = 0;
  for (const item of list) {
    if (i < sub.length && sub[i] === item) i++;
  }
  return i === sub.length;
}

describe('envPairing (property-based)', () => {
  test('never throws on arbitrary discoveries', () => {
    const cwd = freshCwd();
    fc.assert(
      fc.property(discoveryArb(cwd), (d) => {
        envPairing(d);
      }),
      { numRuns: 2000 },
    );
  });

  test('emitted env names are a subsequence of the input list', () => {
    const cwd = freshCwd();
    fc.assert(
      fc.property(discoveryArb(cwd), (d) => {
        const names = envPairing(d).map((p) => p.envName);
        expect(isSubsequence(names, effectiveList(d))).toBe(true);
        expect(names.length).toBeLessThanOrEqual(effectiveList(d).length);
      }),
      { numRuns: 2000 },
    );
  });

  test('outside example-only mode, every env file is paired, in order', () => {
    const cwd = freshCwd();
    fc.assert(
      fc.property(
        discoveryArb(cwd).filter((d) => !isExampleOnly(d)),
        (d) => {
          const names = envPairing(d).map((p) => p.envName);
          expect(names).toEqual(effectiveList(d));
        },
      ),
      { numRuns: 2000 },
    );
  });

  test('envPath is always the absolute resolution of its envName', () => {
    const cwd = freshCwd();
    fc.assert(
      fc.property(discoveryArb(cwd), (d) => {
        for (const pair of envPairing(d)) {
          expect(pair.envPath).toBe(path.resolve(d.cwd, pair.envName));
          expect(path.isAbsolute(pair.envPath)).toBe(true);
          expect(path.isAbsolute(pair.examplePath)).toBe(true);
        }
      }),
      { numRuns: 2000 },
    );
  });

  test('example-only mode pins every examplePath to primaryExample and skips self-pairs', () => {
    const cwd = freshCwd();
    fc.assert(
      fc.property(discoveryArb(cwd).filter(isExampleOnly), (d) => {
        const pinned = path.resolve(d.cwd, d.primaryExample);
        for (const pair of envPairing(d)) {
          expect(pair.examplePath).toBe(pinned);
          // The example file is never compared against itself.
          expect(pair.envPath).not.toBe(pinned);
        }
      }),
      { numRuns: 2000 },
    );
  });

  test('in normal mode, examplePath uses the suffixed example when it exists, else falls back to primaryExample', () => {
    fc.assert(
      fc.property(
        // A single env file, no flags, so we hit the fs-existence branch cleanly.
        fc.record({
          envName: fc.oneof(
            fc.constant(DEFAULT_ENV_FILE),
            suffixArb.map((s) => `${DEFAULT_ENV_FILE}.${s}`),
          ),
          primaryExample: primaryExampleArb,
          createExample: fc.boolean(),
        }),
        ({ envName, primaryExample, createExample }) => {
          const cwd = freshCwd();
          const exampleName = expectedExampleName(envName, primaryExample);
          if (createExample) {
            fs.writeFileSync(path.join(cwd, exampleName), 'FOO=bar\n');
          }
          const d: Discovery = {
            cwd,
            envFiles: [envName],
            primaryEnv: DEFAULT_ENV_FILE,
            primaryExample,
            envFlag: null,
            exampleFlag: null,
            alreadyWarnedMissingEnv: false,
          };
          const [pair] = envPairing(d);
          const expected = createExample
            ? path.resolve(cwd, exampleName)
            : path.resolve(cwd, primaryExample);
          expect(pair!.examplePath).toBe(expected);
        },
      ),
      { numRuns: 500 },
    );
  });
});
