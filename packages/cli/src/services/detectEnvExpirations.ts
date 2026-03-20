import fs from 'fs';
import type { ExpireWarning } from '../config/types.js';

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

  const reg = /(\/\/|#)?\s*@?expire\s+(\d{4}-\d{2}-\d{2})/i;

  let pendingExpire: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();

    const expireMatch = line.match(reg);

    if (expireMatch) {
      pendingExpire = expireMatch[2]!; // capture date
      continue;
    }

    const isEnvKey = /^[A-Za-z0-9_.-]+=/.test(line);

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
function calculateDaysLeft(expireDateStr: string, now: Date): number | null {
  const parts = expireDateStr.split('-').map(Number);
  if (parts.length !== 3) return null;

  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  const expireUtc = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Math.ceil((expireUtc - todayUtc) / MS_PER_DAY);
}
