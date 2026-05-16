/**
 * Benchmarks for scanFile's line/column lookup — verifies that precomputing
 * line offsets once and binary-searching beats slicing the file from the
 * start for every match (which is O(matches × file size)).
 *
 * Both benchmarks accumulate their results into `sink`, which is read in
 * afterAll. This prevents the optimizer from eliminating the lookups as dead
 * code, which would otherwise make the binary-search numbers untrustworthy.
 *
 * Run with: pnpm vitest bench
 */

import { bench, describe, afterAll } from 'vitest';

// --- Build one large synthetic file ---
// The quadratic behavior is within a single file: each match in the OLD path
// copies everything from the file start up to the match. A big file with many
// matches spread throughout is the case that hurts.
const LINE_COUNT = 10_000;
const sourceLines: string[] = [];
for (let i = 0; i < LINE_COUNT; i++) {
  if (i % 20 === 0) {
    sourceLines.push(`  const value${i} = process.env.API_KEY_${i};`);
  } else {
    sourceLines.push(
      `  // line ${i}: ordinary code doing some work with local values`,
    );
  }
}
const content = sourceLines.join('\n');

// Collect the absolute offsets of every "process.env." occurrence — these are
// the match indices scanFile would feed into the line/column lookup.
const MATCH_TOKEN = 'process.env.';
const matchIndices: number[] = [];
for (
  let idx = content.indexOf(MATCH_TOKEN);
  idx !== -1;
  idx = content.indexOf(MATCH_TOKEN, idx + MATCH_TOKEN.length)
) {
  matchIndices.push(idx);
}

// --- OLD: substring + split per match ---
function oldLineCol(
  text: string,
  matchIndex: number,
): { line: number; column: number } {
  const beforeMatch = text.substring(0, matchIndex);
  const line = beforeMatch.split('\n').length;
  const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
  const column =
    lastNewlineIndex === -1 ? matchIndex + 1 : matchIndex - lastNewlineIndex;
  return { line, column };
}

// --- NEW: precompute line offsets once, then binary search per match ---
function buildLineStarts(lines: string[]): number[] {
  const lineStarts = new Array<number>(lines.length);
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    lineStarts[i] = offset;
    offset += lines[i]!.length + 1; // +1 for the stripped '\n'
  }
  return lineStarts;
}

function newLineCol(
  lineStarts: number[],
  offset: number,
): { line: number; column: number } {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid]! <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - lineStarts[lo]! + 1 };
}

// --- Correctness check: both must agree before the numbers mean anything ---
{
  const lineStarts = buildLineStarts(sourceLines);
  for (const idx of matchIndices) {
    const a = oldLineCol(content, idx);
    const b = newLineCol(lineStarts, idx);
    if (a.line !== b.line || a.column !== b.column) {
      throw new Error(
        `line/col mismatch at offset ${idx}: ` +
          `old=${JSON.stringify(a)} new=${JSON.stringify(b)}`,
      );
    }
  }
}

// Accumulator the optimizer cannot prove is unused — see afterAll below.
let sink = 0;

afterAll(() => {
  // Reading sink forces every `sink +=` in the benchmarks to be "live",
  // so the lookup work cannot be eliminated as dead code.
  if (Number.isNaN(sink)) {
    throw new Error('unreachable — sink should never be NaN');
  }
});

// --- Benchmarks ---
// Each iteration = one scanFile-equivalent pass over a single large file:
// resolve line/column for every match in it, consuming each result.
describe('scanFile line/column lookup: substring vs binary search', () => {
  bench('old: substring(0, idx).split per match', () => {
    for (const idx of matchIndices) {
      const r = oldLineCol(content, idx);
      sink += r.line + r.column;
    }
  });

  bench('new: precompute line offsets + binary search', () => {
    // buildLineStarts runs once per file, exactly as in scanFile.
    const lineStarts = buildLineStarts(sourceLines);
    for (const idx of matchIndices) {
      const r = newLineCol(lineStarts, idx);
      sink += r.line + r.column;
    }
  });
});
