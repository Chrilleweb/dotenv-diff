/**
 * Benchmarks for findFiles glob matching — verifies that caching compiled
 * regexes (instead of recompiling per call) is faster on realistic workloads.
 *
 * Run with: pnpm vitest bench
 */

import { describe, expect, test } from 'vitest';
import path from 'path';

// --- Setup: realistic corpus ---
// Simulates ~2000 files spread across nested directories with mixed extensions,
// and a typical set of include + exclude patterns from a scan run.
const FILE_COUNT = 2000;

const PATTERNS = [
  // Includes (default extension patterns)
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
  '**/*.mjs',
  '**/*.cjs',
  '**/*.svelte',
  '**/*.vue',
  // Excludes (default patterns + common user excludes)
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '*.test.ts',
  '*.spec.ts',
  '__tests__/**',
];

const filePaths: string[] = Array.from({ length: FILE_COUNT }, (_, i) => {
  const depth = (i % 5) + 1;
  const dirs = Array.from({ length: depth }, (_, d) => `dir${d}`).join('/');
  const ext = ['ts', 'tsx', 'js', 'json', 'md'][i % 5];
  return `${dirs}/file-${i}.${ext}`;
});

// --- Old implementation (compiles RegExp on every call) ---
function matchesGlobPatternUncached(
  filePath: string,
  pattern: string,
): boolean {
  const hasSep = /[\/\\]/.test(pattern);
  const subject = hasSep ? filePath : path.basename(filePath);

  const normalized = subject.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  const regexPattern = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___DOUBLESTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLESTAR___/g, '.*')
    .replace(/\?/g, '[^/]');

  const re = new RegExp(`^${regexPattern}$`);
  return re.test(normalized);
}

// --- New implementation (caches compiled regex per pattern) ---
const globRegexCache = new Map<string, RegExp>();

function compileGlob(pattern: string): RegExp {
  const cached = globRegexCache.get(pattern);
  if (cached) return cached;

  const normalized = pattern.replace(/\\/g, '/');
  const regexBody = normalized
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___DS___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DS___/g, '.*')
    .replace(/\?/g, '[^/]');

  const re = new RegExp(`^${regexBody}$`);
  globRegexCache.set(pattern, re);
  return re;
}

function matchesGlobPatternCached(filePath: string, pattern: string): boolean {
  const hasSep = /[\/\\]/.test(pattern);
  const subject = hasSep ? filePath : path.basename(filePath);
  return compileGlob(pattern).test(subject.replace(/\\/g, '/'));
}

// --- Benchmarks ---
// Each iteration runs every file path against every pattern, which mirrors
// how shouldInclude / shouldExclude are called during a directory walk.
describe('matchesGlobPattern: uncached vs cached', () => {
  test('recompiling vs caching the glob regex', async ({ bench }) => {
    // `sink` keeps the match results live so the engine cannot drop the calls
    // as dead code — see https://vitest.dev/guide/benchmarking#stability
    let sink = 0;

    const result = await bench.compare(
      bench('uncached (old) — compiles RegExp per call', () => {
        for (const filePath of filePaths) {
          for (const pattern of PATTERNS) {
            if (matchesGlobPatternUncached(filePath, pattern)) sink++;
          }
        }
      }),
      bench('cached (new) — compiles each RegExp once', () => {
        for (const filePath of filePaths) {
          for (const pattern of PATTERNS) {
            if (matchesGlobPatternCached(filePath, pattern)) sink++;
          }
        }
      }),
    );

    if (Number.isNaN(sink)) throw new Error('unreachable');

    expect(
      result.get('cached (new) — compiles each RegExp once'),
    ).toBeFasterThan(result.get('uncached (old) — compiles RegExp per call'));
  });
});
