/**
 * Benchmarks for scanFile pattern matching — verifies that reusing the
 * precompiled pattern regexes is faster than recompiling them via
 * `new RegExp(source, flags)` for every file.
 *
 * Run with: pnpm vitest bench
 */

import { describe, expect, test } from 'vitest';

// --- Representative env-detection patterns ---
// Approximates ENV_PATTERNS: a mix of patterns, most of which do NOT match a
// given file. The recompile cost is paid per pattern per file regardless of
// whether the pattern matches anything, so the non-matching ones matter too.
const PATTERN_SOURCES: { source: string; flags: string }[] = [
  { source: 'process\\.env\\.([A-Za-z_$][\\w$]*)', flags: 'g' },
  { source: 'process\\.env\\[\\s*[\'"`]([^\'"`]+)[\'"`]\\s*\\]', flags: 'g' },
  { source: 'import\\.meta\\.env\\.([A-Za-z_$][\\w$]*)', flags: 'g' },
  {
    source: 'import\\.meta\\.env\\[\\s*[\'"`]([^\'"`]+)[\'"`]\\s*\\]',
    flags: 'g',
  },
  {
    source: 'Deno\\.env\\.get\\(\\s*[\'"`]([^\'"`]+)[\'"`]\\s*\\)',
    flags: 'g',
  },
  { source: 'Bun\\.env\\.([A-Za-z_$][\\w$]*)', flags: 'g' },
  { source: 'getEnv\\(\\s*[\'"`]([^\'"`]+)[\'"`]\\s*\\)', flags: 'g' },
  {
    source:
      'import\\s*\\{([^}]*)\\}\\s*from\\s*[\'"]\\$env/static/private[\'"]',
    flags: 'g',
  },
  {
    source: 'import\\s*\\{([^}]*)\\}\\s*from\\s*[\'"]\\$env/static/public[\'"]',
    flags: 'g',
  },
  {
    source:
      'import\\s*\\{([^}]*)\\}\\s*from\\s*[\'"]\\$env/dynamic/private[\'"]',
    flags: 'g',
  },
  {
    source:
      'import\\s*\\{([^}]*)\\}\\s*from\\s*[\'"]\\$env/dynamic/public[\'"]',
    flags: 'g',
  },
  { source: 'env\\.([A-Z_][A-Z0-9_]*)', flags: 'g' },
  { source: 'useRuntimeConfig\\(\\)\\.([A-Za-z_$][\\w$]*)', flags: 'g' },
  { source: 'config\\(\\s*[\'"`]([^\'"`]+)[\'"`]\\s*\\)', flags: 'g' },
];

// The "new" approach reuses these precompiled regexes across all files.
const COMPILED = PATTERN_SOURCES.map((p) => new RegExp(p.source, p.flags));

// --- Synthetic files: realistic mix of env usage and plain code ---
function makeFile(i: number): string {
  const lines: string[] = [];
  for (let j = 0; j < 120; j++) {
    if (j % 9 === 0) {
      lines.push(`const v${j} = process.env.API_KEY_${i}_${j};`);
    } else if (j % 13 === 0) {
      lines.push(`const w${j} = import.meta.env.PUBLIC_VAR_${j};`);
    } else if (j % 17 === 0) {
      lines.push(`const c${j} = getEnv("DATABASE_URL_${j}");`);
    } else {
      lines.push(`function fn${i}_${j}(x: number) { return x + ${j}; }`);
    }
  }
  return lines.join('\n');
}

const FILE_COUNT = 150;
const files = Array.from({ length: FILE_COUNT }, (_, i) => makeFile(i));

// --- Benchmarks ---
// Each iteration scans every file with every pattern, mirroring how scanFile
// is called once per file across a codebase scan.
describe('scanFile pattern matching: new RegExp vs reuse', () => {
  test('recompiling vs reusing the pattern regexes', async ({ bench }) => {
    // `sink` consumes each captured name so the engine cannot drop the exec
    // loops as dead code — see https://vitest.dev/guide/benchmarking#stability
    let sink = 0;

    const result = await bench.compare(
      bench('old: new RegExp per pattern per file', () => {
        for (const content of files) {
          for (const p of PATTERN_SOURCES) {
            const regex = new RegExp(p.source, p.flags);
            let m: RegExpExecArray | null;
            while ((m = regex.exec(content)) !== null) {
              sink += m[1]?.length ?? 0;
            }
          }
        }
      }),
      bench('new: reuse precompiled regex, reset lastIndex', () => {
        for (const content of files) {
          for (const regex of COMPILED) {
            regex.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = regex.exec(content)) !== null) {
              sink += m[1]?.length ?? 0;
            }
          }
        }
      }),
    );

    if (Number.isNaN(sink)) throw new Error('unreachable');

    expect(
      result.get('new: reuse precompiled regex, reset lastIndex'),
    ).toBeFasterThan(result.get('old: new RegExp per pattern per file'));
  });
});
