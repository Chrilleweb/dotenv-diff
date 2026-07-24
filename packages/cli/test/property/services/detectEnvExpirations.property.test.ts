import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  detectEnvExpirations,
  calculateDaysLeft,
} from '../../../src/services/detectEnvExpirations.js';

/**
 * Property-based ("fuzz") tests for the `@expire` date logic.
 *
 * The expiration comment regex only checks the *digit shape* `\d{4}-\d{2}-\d{2}`,
 * so nonsensical calendar dates like `2024-13-45` or `2024-02-30` reach the date
 * math. `Date.UTC` silently rolls those over into a valid-but-wrong date, which
 * would make the tool report a bogus `daysLeft` while still displaying the
 * impossible date. These tests feed thousands of random date shapes through the
 * logic to prove it never throws and only ever accepts real calendar dates.
 * Property-based testing is also what OpenSSF Scorecard recognises as fuzzing
 * for JS/TS.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** A fixed "now" so day-count assertions are deterministic. */
const NOW = new Date('2024-06-15T12:00:00.000Z');

const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** Formats numeric parts as a YYYY-MM-DD-shaped string (matches the regex). */
const fmt = (y: number, m: number, d: number) =>
  `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;

/** True when (y, m, d) is a real calendar date (m 1-12, d valid for the month). */
function isRealDate(y: number, m: number, d: number): boolean {
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const rt = new Date(Date.UTC(y, m - 1, d));
  return (
    rt.getUTCFullYear() === y &&
    rt.getUTCMonth() === m - 1 &&
    rt.getUTCDate() === d
  );
}

describe('calculateDaysLeft (property-based)', () => {
  // Deliberately overshoots valid ranges so ~most generated dates are invalid.
  const parts = fc.record({
    y: fc.integer({ min: 0, max: 9999 }),
    m: fc.integer({ min: 0, max: 20 }),
    d: fc.integer({ min: 0, max: 40 }),
  });

  test('never throws on arbitrary date-shaped strings', () => {
    fc.assert(
      fc.property(parts, ({ y, m, d }) => {
        calculateDaysLeft(fmt(y, m, d), NOW);
      }),
      { numRuns: 3000 },
    );
  });

  test('never throws on fully arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (s) => {
        calculateDaysLeft(s, NOW);
      }),
      { numRuns: 2000 },
    );
  });

  test('accepts a value iff the string is a real calendar date', () => {
    fc.assert(
      fc.property(parts, ({ y, m, d }) => {
        const result = calculateDaysLeft(fmt(y, m, d), NOW);
        if (isRealDate(y, m, d)) {
          expect(result).not.toBeNull();
          expect(Number.isInteger(result)).toBe(true);
        } else {
          // Impossible dates must be rejected, never silently rolled over.
          expect(result).toBeNull();
        }
      }),
      { numRuns: 5000 },
    );
  });

  test('a returned day count matches independent UTC-day arithmetic', () => {
    const realParts = parts.filter(({ y, m, d }) => isRealDate(y, m, d));
    fc.assert(
      fc.property(realParts, ({ y, m, d }) => {
        const result = calculateDaysLeft(fmt(y, m, d), NOW);
        const todayUtc = Date.UTC(2024, 5, 15); // NOW, at UTC-day granularity
        const expected = Math.ceil(
          (Date.UTC(y, m - 1, d) - todayUtc) / MS_PER_DAY,
        );
        expect(result).toBe(expected);
      }),
      { numRuns: 3000 },
    );
  });

  test('a date equal to today has zero days left', () => {
    expect(calculateDaysLeft('2024-06-15', NOW)).toBe(0);
  });

  test('later valid dates never have fewer days left than earlier ones', () => {
    const realParts = parts.filter(({ y, m, d }) => isRealDate(y, m, d));
    fc.assert(
      fc.property(realParts, realParts, (a, b) => {
        const da = calculateDaysLeft(fmt(a.y, a.m, a.d), NOW)!;
        const db = calculateDaysLeft(fmt(b.y, b.m, b.d), NOW)!;
        const tsa = Date.UTC(a.y, a.m - 1, a.d);
        const tsb = Date.UTC(b.y, b.m - 1, b.d);
        if (tsa < tsb) expect(da).toBeLessThanOrEqual(db);
        else if (tsa > tsb) expect(da).toBeGreaterThanOrEqual(db);
      }),
      { numRuns: 2000 },
    );
  });

  test('regression: impossible dates that survived the old guard are rejected', () => {
    // All of these have non-zero y/m/d, so they passed `!year||!month||!day`
    // and were silently rolled over by Date.UTC before the fix.
    for (const bad of [
      '2024-13-45',
      '2024-99-99',
      '2024-02-30',
      '2024-04-31',
      '2023-02-29', // not a leap year
      '2024-00-10',
      '2024-10-00',
    ]) {
      expect(calculateDaysLeft(bad, NOW)).toBeNull();
    }
    // Sanity: a real leap day is still accepted.
    expect(calculateDaysLeft('2024-02-29', NOW)).not.toBeNull();
  });
});

describe('detectEnvExpirations (property-based, via temp files)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expire-prop-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const write = (content: string) => {
    const p = path.join(tmpDir, '.env');
    fs.writeFileSync(p, content);
    return p;
  };

  test('never throws on arbitrary file content', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (content) => {
        detectEnvExpirations(write(content));
      }),
      { numRuns: 1000 },
    );
  });

  test('every emitted warning carries a real calendar date', () => {
    const line = fc.oneof(
      // Random @expire comment (many with impossible dates) followed by a key.
      fc
        .record({
          y: fc.integer({ min: 1000, max: 9999 }),
          m: fc.integer({ min: 0, max: 20 }),
          d: fc.integer({ min: 0, max: 40 }),
        })
        .map(({ y, m, d }) => `# @expire ${fmt(y, m, d)}\nAPI_KEY=1`),
      fc.constant('PLAIN_KEY=value'),
      fc.constant('# just a comment'),
    );
    fc.assert(
      fc.property(fc.array(line, { maxLength: 20 }), (lines) => {
        const warnings = detectEnvExpirations(write(lines.join('\n')));
        for (const w of warnings) {
          const [y, m, d] = w.date.split('-').map(Number);
          expect(isRealDate(y!, m!, d!)).toBe(true);
        }
      }),
      { numRuns: 2000 },
    );
  });
});
