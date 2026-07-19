import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { scanFile } from '../../../../src/core/scan/scanFile.js';
import type { ScanOptions } from '../../../../src/config/types.js';

/**
 * Property-based ("fuzz") tests for the file scanner.
 *
 * scanFile has the largest regex surface in the codebase — every env pattern,
 * dynamically-compiled SvelteKit alias patterns, and an offset→line/column
 * binary search — all run over untrusted source. All shared regexes are global
 * and reset via `lastIndex = 0` in loops, which is only safe if the function is
 * truly stateless between calls. These properties guard exactly that.
 */
describe('scanFile (property-based)', () => {
  const opts: ScanOptions = {
    cwd: '/project',
    include: [],
    exclude: [],
    ignore: [],
    ignoreRegex: [],
    secrets: false,
    json: false,
  };

  // Realistic fragments so the env patterns actually match and the line/column
  // machinery gets exercised, interleaved with adversarial noise.
  const fragment = fc.oneof(
    fc.string(),
    fc.constantFrom(
      'process.env.API_KEY',
      'process.env["DATABASE_URL"]',
      'import.meta.env.VITE_PUBLIC_URL',
      'const env = process.env\n',
      '${SHELL_STYLE_VAR}',
      "import { env } from '$env/dynamic/private'\n",
      'env.SESSION_SECRET',
      '\n',
      '//',
      '/'.repeat(40),
      '"',
      '`',
    ),
  );
  const source = fc.array(fragment, { maxLength: 60 }).map((a) => a.join(''));

  test('never throws on arbitrary input', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (content) => {
        scanFile('/project/src/file.ts', content, opts);
      }),
      { numRuns: 2000 },
    );
  });

  test('every usage has valid, in-bounds line/column pointing at its context', () => {
    fc.assert(
      fc.property(source, (content) => {
        const lines = content.split('\n');
        const usages = scanFile('/project/src/file.ts', content, opts);
        for (const u of usages) {
          expect(typeof u.variable).toBe('string');
          expect(u.variable.length).toBeGreaterThan(0);
          expect(u.line).toBeGreaterThanOrEqual(1);
          expect(u.line).toBeLessThanOrEqual(lines.length);
          expect(u.column).toBeGreaterThanOrEqual(1);
          // The reported context is exactly the source line it points at, and
          // the column falls within that line.
          expect(u.context).toBe(lines[u.line - 1]);
          expect(u.column).toBeLessThanOrEqual(u.context.length + 1);
        }
      }),
      { numRuns: 1500 },
    );
  });

  test('is idempotent — shared regex state does not leak between calls', () => {
    fc.assert(
      fc.property(source, (content) => {
        const first = scanFile('/project/src/file.ts', content, opts);
        const second = scanFile('/project/src/file.ts', content, opts);
        expect(second).toEqual(first);
      }),
      { numRuns: 1500 },
    );
  });
});
