import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import type {
  EnvUsage,
  FrameworkWarning,
} from '../../../../src/config/types.js';
import { applyNextJsRules } from '../../../../src/core/frameworks/nextJsRules.js';
import { applyNuxtRules } from '../../../../src/core/frameworks/nuxtRules.js';
import { applySvelteKitRules } from '../../../../src/core/frameworks/sveltekitRules.js';
import { normalizePath } from '../../../../src/core/helpers/normalizePath.js';

/**
 * Property-based ("fuzz") tests for the per-framework validation rules.
 *
 * Each `apply*Rules` function inspects one env-var usage and pushes at most one
 * warning. They are branchy (path regexes, prefix checks, a sensitive-keyword
 * matcher), so these throw thousands of random usages — odd file paths, unicode
 * variables, every access pattern, arbitrary `$env` imports — at all three to
 * prove the invariants that must hold whatever the rule decides: they never
 * throw, never emit more than one warning per usage, always short-circuit for
 * `node_modules`, are deterministic, and every warning they emit is well-formed
 * (its variable/line come from the usage, its file is normalised, its framework
 * tag is correct). Property-based testing is also what OpenSSF Scorecard
 * recognises as fuzzing for JS/TS.
 */

const PREFIXES = [
  'NEXT_PUBLIC_',
  'PUBLIC_',
  'VITE_',
  'NUXT_PUBLIC_',
  'NUXT_',
  '',
];
const SUFFIXES = [
  'SECRET',
  'PRIVATE',
  'PASSWORD',
  'secret',
  'API_KEY',
  'URL',
  '',
];

const variableArb = fc.oneof(
  fc
    .tuple(fc.constantFrom(...PREFIXES), fc.constantFrom(...SUFFIXES))
    .map(([p, s]) => `${p}${s}`),
  fc.string({ unit: 'binary' }),
);

/** File paths that deliberately land on (and near) the framework path regexes. */
const fileArb = fc.oneof(
  fc.constantFrom(
    'src/routes/+page.svelte',
    'src/routes/+page.ts',
    'src/routes/+layout.server.ts',
    'src/hooks.server.ts',
    'src/lib/server/db.ts',
    'svelte.config.js',
    'pages/index.tsx',
    'pages/api/users.ts',
    'app/page.tsx',
    'nuxt.config.ts',
    'server/api/foo.ts',
    'components/Foo.server.vue',
    'node_modules/pkg/index.js',
    'a\\b\\pages\\api\\x.ts',
    'weird.server.data/x.ts',
    '',
  ),
  fc.string({ unit: 'binary' }),
);

const importsArb = fc.option(
  fc.subarray([
    '$env/dynamic/private',
    '$env/dynamic/public',
    '$env/static/private',
    '$env/static/public',
    '$env/whatever',
  ]),
  { nil: undefined },
);

const usageArb: fc.Arbitrary<EnvUsage> = fc.record({
  variable: variableArb,
  file: fileArb,
  line: fc.nat({ max: 100000 }),
  column: fc.nat({ max: 100000 }),
  pattern: fc.constantFrom(
    'process.env',
    'import.meta.env',
    'sveltekit',
    'vite',
    'docker-compose',
  ),
  imports: importsArb,
  context: fc.string(),
  isLogged: fc.option(fc.boolean(), { nil: undefined }),
}) as fc.Arbitrary<EnvUsage>;

type Rule = (
  u: EnvUsage,
  warnings: FrameworkWarning[],
  fileContentMap?: Map<string, string>,
) => void;

const RULES: Array<{ name: string; fn: Rule; framework: string }> = [
  { name: 'nextjs', fn: applyNextJsRules, framework: 'nextjs' },
  { name: 'nuxt', fn: applyNuxtRules as Rule, framework: 'nuxt' },
  {
    name: 'sveltekit',
    fn: applySvelteKitRules as Rule,
    framework: 'sveltekit',
  },
];

const run = (fn: Rule, u: EnvUsage): FrameworkWarning[] => {
  const w: FrameworkWarning[] = [];
  fn(u, w);
  return w;
};

describe.each(RULES)('$name rules (property-based)', ({ fn, framework }) => {
  test('never throws on arbitrary usages', () => {
    fc.assert(
      fc.property(usageArb, (u) => {
        run(fn, u);
      }),
      { numRuns: 4000 },
    );
  });

  test('emits at most one warning per usage', () => {
    fc.assert(
      fc.property(usageArb, (u) => {
        expect(run(fn, u).length).toBeLessThanOrEqual(1);
      }),
      { numRuns: 4000 },
    );
  });

  test('every emitted warning is well-formed', () => {
    fc.assert(
      fc.property(usageArb, (u) => {
        for (const w of run(fn, u)) {
          expect(w.variable).toBe(u.variable);
          expect(w.line).toBe(u.line);
          expect(w.file).toBe(normalizePath(u.file));
          expect(w.framework).toBe(framework);
          expect(typeof w.reason).toBe('string');
          expect(w.reason.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 4000 },
    );
  });

  test('never warns for files under node_modules', () => {
    fc.assert(
      fc.property(usageArb, (u) => {
        if (normalizePath(u.file).includes('/node_modules/')) {
          expect(run(fn, u)).toEqual([]);
        }
      }),
      { numRuns: 4000 },
    );
  });

  test('is deterministic', () => {
    fc.assert(
      fc.property(usageArb, (u) => {
        expect(run(fn, u)).toEqual(run(fn, u));
      }),
      { numRuns: 3000 },
    );
  });

  test('does not mutate the usage object', () => {
    fc.assert(
      fc.property(usageArb, (u) => {
        const snapshot = JSON.stringify(u);
        run(fn, u);
        expect(JSON.stringify(u)).toBe(snapshot);
      }),
      { numRuns: 2000 },
    );
  });
});

describe('applySvelteKitRules — $lib/server is server context (property-based)', () => {
  test('process.env in a $lib/server file never triggers the client-usage warning', () => {
    const serverPath = fc
      .array(fc.stringMatching(/^[a-z]{1,8}$/), { minLength: 0, maxLength: 3 })
      .map((segs) => ['src/lib/server', ...segs, 'mod.ts'].join('/'));
    fc.assert(
      fc.property(variableArb, serverPath, (variable, file) => {
        const u = {
          variable,
          file,
          line: 1,
          column: 1,
          pattern: 'process.env',
          context: '',
        } as EnvUsage;
        const w: FrameworkWarning[] = [];
        applySvelteKitRules(u, w);
        expect(
          w.some(
            (x) =>
              x.reason === 'process.env should only be used in server files',
          ),
        ).toBe(false);
      }),
      { numRuns: 2000 },
    );
  });
});

describe('applyNextJsRules — fileContentMap handling (property-based)', () => {
  test('a "use client" file forces the NEXT_PUBLIC_ requirement', () => {
    const nonPublicVar = fc
      .tuple(fc.constantFrom('', 'FOO_', 'API_'), fc.constantFrom('KEY', 'URL'))
      .map(([p, s]) => `${p}${s}`)
      .filter((v) => !v.startsWith('NEXT_PUBLIC_'));
    // A plain non-route file so only the client-directive drives the result.
    fc.assert(
      fc.property(
        nonPublicVar,
        fc.constantFrom('src/a.ts', 'lib/b.tsx'),
        (variable, file) => {
          const u = {
            variable,
            file,
            line: 1,
            column: 1,
            pattern: 'process.env',
            context: '',
          } as EnvUsage;
          const map = new Map([[file, '"use client"\nconst x = 1']]);
          const w: FrameworkWarning[] = [];
          applyNextJsRules(u, w, map);
          expect(w).toHaveLength(1);
          expect(w[0]!.reason).toBe(
            'Server-only variable accessed from client code',
          );
        },
      ),
      { numRuns: 1000 },
    );
  });

  test('never throws with arbitrary file-content maps', () => {
    fc.assert(
      fc.property(usageArb, fc.string({ unit: 'binary' }), (u, content) => {
        const w: FrameworkWarning[] = [];
        applyNextJsRules(u, w, new Map([[u.file, content]]));
      }),
      { numRuns: 2000 },
    );
  });
});
