import fs from 'fs';

/**
 * Scan a .env-like file for duplicate keys.
 * - Ignores empty lines and comments (#...)
 * - Splits on first '='
 * - Trims the key
 * - Returns keys that appear more than once, with counts
 */
export function findDuplicateKeys(filePath: string): Array<{ key: string; count: number }> {
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');

  const counts = new Map<string, number>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue; // no '=' or empty key

    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const duplicates: Array<{ key: string; count: number }> = [];
  for (const [key, count] of counts) {
    if (count > 1) duplicates.push({ key, count });
  }
  return duplicates;
}
