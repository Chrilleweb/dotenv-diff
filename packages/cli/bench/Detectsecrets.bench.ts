/**
 * Benchmarks for the LONG_LITERAL regex in detectSecretsInSource —
 * verifies that letting the regex engine filter to 32+ chars is faster
 * than matching 24+ and discarding short ones in JS afterwards.
 *
 * Run with: pnpm vitest bench
 */

import { bench, describe } from 'vitest';

// --- Synthetic source: realistic mix of literal lengths ---
// The point of this bench is to show how much work is wasted when the regex
// captures 24-31 char literals that we always throw away. So we need a source
// with a representative number of medium-length literals.
function makeSource(): string {
  const lines: string[] = [];

  // ~200 lines of imports & short declarations (no matches in either regex)
  for (let i = 0; i < 200; i++) {
    lines.push(`import { Component${i} } from './components/c${i}';`);
  }

  // ~300 lines with medium literals (24-31 chars) — captured by OLD, ignored by NEW.
  // These are the "wasted work" cases: URLs, slugs, descriptions, error IDs, etc.
  for (let i = 0; i < 300; i++) {
    const padding = 'abcdefghij'.repeat(2).slice(0, 14 + (i % 8)); // 14-21 chars
    lines.push(`const slug${i} = "user_profile_${padding}";`); // total ~27-34 chars
  }

  // ~300 lines with short literals (<24 chars) — neither regex matches
  for (let i = 0; i < 300; i++) {
    lines.push(`const label${i} = "Click me ${i}";`);
  }

  // ~50 lines with genuinely long literals (32+) — both regexes match
  for (let i = 0; i < 50; i++) {
    const long = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123456789'.slice(
      0,
      36 + (i % 8),
    );
    lines.push(`const token${i} = "${long}";`);
  }

  // ~200 lines of boilerplate (no string literals)
  for (let i = 0; i < 200; i++) {
    lines.push(`function helper${i}(x: number) { return x * ${i}; }`);
  }

  return lines.join('\n');
}

// --- Old vs new regex ---
const OLD_LONG_LITERAL = /["'`]{1}([A-Za-z0-9+/_\-]{24,})["'`]{1}/g;
const NEW_LONG_LITERAL = /["'`]([A-Za-z0-9+/_\-]{32,})["'`]/g;

// --- Subset of looksHarmlessLiteral, the real downstream cost ---
// In production the matched literal goes through ~10 regex tests in
// looksHarmlessLiteral. We approximate that cost here so the bench reflects
// the actual savings: the OLD path runs these on 24-31 char garbage matches
// that we always throw away; the NEW path never sees them.
const HARMLESS_CHECKS = [
  /\S+@\S+/,
  /^data:[a-z]+\/[a-z0-9.+-]+;base64,/i,
  /^\.{0,2}\//,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^[0-9a-f]{32,128}$/i,
  /^[A-Za-z0-9+/_\-]{16,20}={0,2}$/,
  /^[A-Za-z0-9+/_\-]*(_PUBLIC|_PRIVATE|VITE_|NEXT_PUBLIC|VUE_)[A-Za-z0-9+/_\-]*={0,2}$/,
  /^[MmZzLlHhVvCcSsQqTtAa][0-9eE+.\- ,MmZzLlHhVvCcSsQqTtAa]*$/,
];

function looksHarmless(s: string): boolean {
  return HARMLESS_CHECKS.some((rx) => rx.test(s));
}

const source = makeSource();
const lines = source.split('\n');

// --- Benchmarks ---
// Each iteration scans the full synthetic source the way detectSecretsInSource
// would: per line, run the regex, then the harmless check, then (in the old
// version) the length filter.
describe('LONG_LITERAL: {24,} (old) vs {32,} (new)', () => {
  bench('old: regex {24,} + JS-side length filter', () => {
    for (const line of lines) {
      OLD_LONG_LITERAL.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = OLD_LONG_LITERAL.exec(line)) !== null) {
        const literal = m[1]!;
        if (looksHarmless(literal)) continue;
        if (literal.length < 32) continue;
        // entropy calc would go here in production
      }
    }
  });

  bench('new: regex {32,} — engine does the filtering', () => {
    for (const line of lines) {
      NEW_LONG_LITERAL.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = NEW_LONG_LITERAL.exec(line)) !== null) {
        const literal = m[1]!;
        if (looksHarmless(literal)) continue;
        // no length check needed
      }
    }
  });
});
