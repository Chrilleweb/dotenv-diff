import type { ExpireWarning } from '../../config/types.js';
import {
  label,
  value,
  error,
  warning,
  divider,
  header,
} from '../theme.js';
import { EXPIRE_THRESHOLD_DAYS } from '../../config/constants.js';

/**
 * Prints expiration warnings for environment variables.
 * Only shows variables expiring within the threshold defined in constants or already expired.
 * @param warnings Array of expiration warnings
 * @returns void
 */
export function printExpireWarnings(
  warnings: ExpireWarning[],
  strict: boolean = false,
): void {
  const relevant = warnings.filter((w) => w.daysLeft <= EXPIRE_THRESHOLD_DAYS);
  if (relevant.length === 0) return;

  const mostUrgent = relevant.reduce(
    (min, w) => Math.min(min, w.daysLeft),
    Infinity,
  );

  const indicator = strict || mostUrgent <= 7 ? error('▸') : warning('▸');

  console.log();
  console.log(`${indicator} ${header('Expiration warnings')}`);
  console.log(`${divider}`);

  const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

  for (const warn of relevant) {
    const statusText =
      warn.daysLeft <= 0
        ? `expired ${days(Math.abs(warn.daysLeft))} ago`
        : `expires in ${days(warn.daysLeft)}`;

    const rowColor =
      strict || warn.daysLeft <= 7
        ? error
        : warn.daysLeft <= EXPIRE_THRESHOLD_DAYS
          ? warning
          : value;

    console.log(`${label(warn.key.padEnd(26))}${rowColor(statusText)}`);
  }

  console.log(`${divider}`);
}
