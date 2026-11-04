/**
 * Benchmarks for the whole-file minified check in scanCodebase — verifies
 * that counting newlines is cheaper than the old approach of splitting every
 * file into lines and testing each one.
 *
 * Both benchmarks accumulate their results into `sink`, which is read after
 * bench.compare resolves, so the checks cannot be dropped as dead code.
 * See https://vitest.dev/guide/benchmarking#stability
 *
 * Run with: pnpm vitest bench
 */

import { describe, expect, test } from 'vitest';
import { isMinifiedFile } from '../src/core/helpers/isMinifiedFile.js';

// Vite's module runner turns imported bindings into getters, so calling them
// directly inside a benchmark measures the getter too. Bind it locally once.
const _isMinifiedFile = isMinifiedFile;

// --- OLD: split into lines and flag the file if any line is long ---
function oldIsLikelyMinified(content: string): boolean {
  return content.split(/\r?\n/).some((line) => line.length > 500);
}

// --- Inputs: the files a scan actually sees ---
// Most files in a repo are ordinary source files, which the check must clear
// as cheaply as possible. A large file is the worst case for the old split.
const normalFile = Array.from(
  { length: 300 },
  (_, i) => `  const value${i} = process.env.API_KEY_${i} ?? 'fallback';`,
).join('\n');

const largeFile = Array.from(
  { length: 20_000 },
  (_, i) => `  const value${i} = process.env.API_KEY_${i} ?? 'fallback';`,
).join('\n');

const bundle = 'var a=function(){return 1};'.repeat(20_000);

describe('isMinifiedFile: split lines vs count newlines', () => {
  test.for([
    ['normal source file', normalFile],
    ['large source file', largeFile],
    ['single-line bundle', bundle],
  ] as const)('%s', async ([, content], { bench }) => {
    let sink = 0;

    const result = await bench.compare(
      bench('split + some (old)', () => {
        if (oldIsLikelyMinified(content)) sink++;
      }),
      bench('count newlines (new)', () => {
        if (_isMinifiedFile('src/file.ts', content)) sink++;
      }),
    );

    if (Number.isNaN(sink)) throw new Error('unreachable');

    expect(result.get('count newlines (new)')).toBeFasterThan(
      result.get('split + some (old)'),
    );
  });
});
