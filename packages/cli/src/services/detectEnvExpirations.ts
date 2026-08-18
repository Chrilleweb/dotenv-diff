import fs from 'fs';
import type { ExpireWarning } from '../config/types.js';
import { ENV_KEY_LINE } from '../config/constants.js';

/**
 * Matches an `@expire` annotation line in any of its accepted forms:
 * `# @expire YYYY-MM-DD`, `// @expire YYYY-MM-DD`, `# expire YYYY-MM-DD`, or a bare `@expire YYYY-MM-DD`.
 */
const EXPIRE_ANNOTATION = /^(?:\/\/|#)?\s*@?expire\s+(\d{4}-\d{2}-\d{2})/i;

// Number of milliseconds in a day
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Detects expiration warnings in a dotenv file.
 * fx:
 *
 * # @expire 2024-12-31
 * API_KEY=
 *
 * This will generate a warning that API_KEY expires on 2024-12-31.
 * @param filePath - Path to the dotenv file
 * @returns Array of expiration warnings
 */
export function detectEnvExpirations(filePath: string): ExpireWarning[] {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  const warnings: ExpireWarning[] = [];

  let pendingExpire: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();

    // A blank line ends the current annotation block. Comments are carried
    // over (an `@expire` may sit above a documented key), but an empty line
    // signals "end of block" so a pending annotation cannot leak across a gap
    // and attach itself to an unrelated key further down the file.
    if (line === '') {
      pendingExpire = null;
      continue;
    }

    const expireMatch = line.match(EXPIRE_ANNOTATION);

    if (expireMatch) {
      pendingExpire = expireMatch[1]!; // capture date
      continue;
    }

    const isEnvKey = ENV_KEY_LINE.test(line);

    if (isEnvKey) {
      const key = line.split('=')[0];

      if (key && pendingExpire) {
        const diffDays = calculateDaysLeft(pendingExpire, new Date());

        if (diffDays === null) {
          pendingExpire = null;
          continue;
        }

        warnings.push({
          key,
          date: pendingExpire,
          daysLeft: diffDays,
        });

        pendingExpire = null;
      }
    }
  }

  return warnings;
}

/**
 * Calculates remaining days from today (UTC day) to a YYYY-MM-DD expiration date.
 * Using UTC day boundaries avoids timezone and time-of-day drift.
 * @param expireDateStr - Expiration date in YYYY-MM-DD format
 * @param now - Current date
 * @returns Number of days left until expiration, or null if invalid date
 */
export function calculateDaysLeft(
  expireDateStr: string,
  now: Date,
): number | null {
  const parts = expireDateStr.split('-').map(Number);
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  const expireUtc = Date.UTC(year, month - 1, day);

  // Reject non-existent calendar dates (e.g. 2024-13-45, 2024-02-30). The
  // regex only checks the digit shape, so `Date.UTC` would otherwise silently
  // roll them over into a valid-but-wrong date. Round-tripping the timestamp
  // back to its components proves nothing rolled over.
  const roundTrip = new Date(expireUtc);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) {
    return null;
  }

  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Math.ceil((expireUtc - todayUtc) / MS_PER_DAY);
}
