import type { ExpireWarning } from '../../config/types.js';
import { label, value, accent, error, warning, divider, header } from '../theme.js';
import { EXPIRE_THRESHOLD_DAYS } from '../../config/constants.js';

/**
 * Prints expiration warnings for environment variables.
 * Only shows variables expiring within the threshold defined in constants or already expired.
 * @param warnings Array of expiration warnings
 * @returns void
 */
export function printExpireWarnings(warnings: ExpireWarning[]): void {
  const relevant = warnings.filter((w) => w.daysLeft <= EXPIRE_THRESHOLD_DAYS);
  if (relevant.length === 0) return;

  const mostUrgent = relevant.reduce((min, w) => Math.min(min, w.daysLeft), Infinity);

  const indicator =
    mostUrgent <= 0
      ? error('▸')
      : mostUrgent <= 7
        ? warning('▸')
        : accent('▸');

  console.log();
  console.log(`${indicator} ${header('Expiration warnings')}`);
  console.log(`${divider}`);

  const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

  for (const warn of relevant) {
    const status =
      warn.daysLeft <= 0
        ? error(`expired ${days(Math.abs(warn.daysLeft))} ago`)
        : warn.daysLeft <= 7
          ? warning(`expires in ${days(warn.daysLeft)}`)
          : value(`expires in ${days(warn.daysLeft)}`);

    console.log(`${label(warn.key.padEnd(26))}${status}`);
  }

  console.log(`${divider}`);
}
