import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  ENV_PATTERNS,
  DOCKER_COMPOSE_PATTERNS,
  buildSveltekitAliasPatterns,
  isDockerComposeFile,
} from '../../../../src/core/scan/patterns.js';

/**
 * Property-based ("fuzz") tests for the env-usage detection patterns.
 *
 * Each pattern is a regex plus an optional processor that turns a match into a
 * list of variable names; `scanFile` uses `match[1]` when there is no processor.
 * These throw thousands of random source strings — real-looking accessors,
 * destructuring shapes, and pure noise — at every pattern to prove extraction is
 * sound (every variable it yields is a valid UPPER_SNAKE_CASE name), that it
 * never throws, and that reusing the shared `/g` regex objects is stable (no
 * leaked `lastIndex`). Property-based testing is also what OpenSSF Scorecard
 * recognises as fuzzing for JS/TS.
 */

/** The canonical env-var name shape the scanner is supposed to emit. */
const ENV_VAR_NAME = /^[A-Z_][A-Z0-9_]*$/;

const ALIAS_PATTERNS = buildSveltekitAliasPatterns(
  'privateEnv',
  '$env/dynamic/private',
);
const ALL_PATTERNS = [
  ...ENV_PATTERNS,
  ...DOCKER_COMPOSE_PATTERNS,
  ...ALIAS_PATTERNS,
];

type Pat = (typeof ALL_PATTERNS)[number];

/** Mirror of how scanFile drives a pattern, using a *fresh* regex each call. */
function extractFresh(pattern: Pat, content: string): string[] {
  const re = new RegExp(pattern.regex.source, pattern.regex.flags);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(content)) !== null && guard++ < 10000) {
    const vars = pattern.processor ? pattern.processor(m) : [m[1]!];
    out.push(...vars);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

/** Drive a pattern using its shared (module-level) regex object, as scanFile does. */
function extractShared(pattern: Pat, content: string): string[] {
  const re = pattern.regex;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(content)) !== null && guard++ < 10000) {
    const vars = pattern.processor ? pattern.processor(m) : [m[1]!];
    out.push(...vars);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

// ---- source generators biased to actually hit the patterns ----

const upperName = fc.stringMatching(/^[A-Z_][A-Z0-9_]{0,10}$/);
const messyName = fc.oneof(
  upperName,
  fc.stringMatching(/^[A-Za-z0-9_$]{0,10}$/),
  fc.string(),
);

const destructBody = fc
  .array(
    fc.oneof(
      messyName,
      fc.tuple(messyName, messyName).map(([k, a]) => `${k}: ${a}`),
      fc.tuple(messyName, messyName).map(([k, d]) => `${k} = ${d}`),
      fc.constant(''),
      fc.constant('...rest'),
    ),
    { maxLength: 6 },
  )
  .map((parts) => parts.join(', '));

const fragment = fc.oneof(
  messyName.map((n) => `process.env.${n}`),
  messyName.map((n) => `process.env["${n}"]`),
  messyName.map((n) => `process.env['${n}']`),
  messyName.map((n) => `import.meta.env.${n}`),
  messyName.map((n) => `env.${n}`),
  destructBody.map((b) => `const {${b}} = process.env;`),
  destructBody.map((b) => `const {${b}} = env;`),
  destructBody.map((b) => `const {${b}} = privateEnv;`),
  messyName.map((n) => `import { ${n} } from '$env/static/private';`),
  messyName.map((n) => `import ${n} from '$env/dynamic/public';`),
  messyName.map((n) => `\${${n}}`),
  messyName.map((n) => `\${${n}:-default}`),
  messyName.map((n) => `$${n}`),
  fc.string({ unit: 'binary' }),
);

const sourceArb = fc
  .array(fragment, { maxLength: 20 })
  .map((f) => f.join('\n'));

describe('pattern extraction (property-based)', () => {
  test('never throws on arbitrary source', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (content) => {
        for (const p of ALL_PATTERNS) extractFresh(p, content);
      }),
      { numRuns: 2000 },
    );
  });

  test('every extracted variable is a valid UPPER_SNAKE_CASE name (soundness)', () => {
    fc.assert(
      fc.property(sourceArb, (content) => {
        for (const p of ALL_PATTERNS) {
          for (const v of extractFresh(p, content)) {
            expect(typeof v).toBe('string');
            expect(ENV_VAR_NAME.test(v)).toBe(true);
          }
        }
      }),
      { numRuns: 4000 },
    );
  });

  test('reusing the shared /g regex objects is stable (no leaked lastIndex)', () => {
    fc.assert(
      fc.property(sourceArb, (content) => {
        for (const p of ALL_PATTERNS) {
          const a = extractShared(p, content);
          const b = extractShared(p, content);
          expect(b).toEqual(a);
        }
      }),
      { numRuns: 3000 },
    );
  });
});

describe('destructuring processors as pure functions (property-based)', () => {
  // Only the destructuring processors (regex captures a `{ ... }` body) do their
  // own validation; the simple accessor processors rely on their regex group to
  // constrain the value, so they are covered by the full-extraction test above.
  const processors = ALL_PATTERNS.filter(
    (p) => p.processor && p.regex.source.includes('{'),
  ).map((p) => p.processor!);

  const fakeMatch = (group1: string | undefined): RegExpExecArray =>
    Object.assign([group1 === undefined ? '' : group1, group1], {
      index: 0,
      input: '',
    }) as unknown as RegExpExecArray;

  test('never throw and only ever yield valid env-var names', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (raw) => {
        for (const processor of processors) {
          const out = processor(fakeMatch(raw));
          expect(Array.isArray(out)).toBe(true);
          for (const v of out) expect(ENV_VAR_NAME.test(v)).toBe(true);
        }
      }),
      { numRuns: 4000 },
    );
  });
});

describe('buildSveltekitAliasPatterns (property-based)', () => {
  // The only real caller derives the alias from `(?<alias>\w+)`, so this is the
  // contract the function must uphold: any word-char alias builds working
  // patterns without throwing. (Regex-special aliases are out of contract.)
  const wordAlias = fc.stringMatching(/^[A-Za-z_]\w{0,12}$/);

  test('word-char aliases build usable patterns without throwing', () => {
    fc.assert(
      fc.property(wordAlias, upperName, (alias, varName) => {
        const [dot, destructure] = buildSveltekitAliasPatterns(
          alias,
          '$env/dynamic/private',
        );
        expect(dot!.sourceModule).toBe('$env/dynamic/private');
        expect(destructure!.sourceModule).toBe('$env/dynamic/private');
        // The dot accessor matches `<alias>.VAR` and yields the var name.
        expect(extractFresh(dot!, `${alias}.${varName}`)).toEqual([varName]);
        // It must not fire on a *different* identifier's accessor.
        expect(extractFresh(dot!, `not${alias}.${varName}`)).toEqual([]);
      }),
      { numRuns: 2000 },
    );
  });
});

describe('isDockerComposeFile (property-based)', () => {
  test('never throws on arbitrary paths', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (p) => {
        isDockerComposeFile(p);
      }),
      { numRuns: 3000 },
    );
  });

  test('decision is case-insensitive', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (p) => {
        expect(isDockerComposeFile(p.toUpperCase())).toBe(
          isDockerComposeFile(p.toLowerCase()),
        );
      }),
      { numRuns: 3000 },
    );
  });

  test('depends only on the basename, not on leading directories', () => {
    const base = fc.oneof(
      fc.constantFrom(
        'compose.yml',
        'docker-compose.yaml',
        'compose.prod.yml',
        'composer.yml',
        'app.yaml',
        'notcompose.yml',
      ),
      fc.stringMatching(/^[a-z.-]{1,15}\.ya?ml$/),
    );
    const dir = fc.stringMatching(/^[a-z]{1,6}(\/[a-z]{1,6}){0,3}$/);
    fc.assert(
      fc.property(base, dir, (b, d) => {
        expect(isDockerComposeFile(`${d}/${b}`)).toBe(isDockerComposeFile(b));
      }),
      { numRuns: 3000 },
    );
  });

  test('matches documented positives and rejects documented negatives', () => {
    for (const p of [
      'compose.yml',
      'compose.yaml',
      'docker-compose.yml',
      'docker-compose.dev.yml',
      'a/b/compose.prod.yaml',
      'C:\\proj\\docker-compose.yml',
    ]) {
      expect(isDockerComposeFile(p)).toBe(true);
    }
    for (const p of [
      'composer.yml',
      'app.yml',
      'compose.txt',
      'docker-compose.yml.bak',
      'not-compose.yml',
    ]) {
      expect(isDockerComposeFile(p)).toBe(false);
    }
  });
});
