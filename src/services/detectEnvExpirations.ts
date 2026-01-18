import fs from 'fs';
import type { ExpireWarning } from '../config/types.js';

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
      pendingExpire = expireMatch[2] ?? null; // capture dato
      continue;
    }

    const isEnvKey = /^[A-Za-z0-9_.-]+=/.test(line);

    if (isEnvKey) {
      const key = line.split('=')[0];

      if (key && pendingExpire) {
        const expireDate = new Date(pendingExpire);
        const now = new Date();
        const diffMs = expireDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

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
