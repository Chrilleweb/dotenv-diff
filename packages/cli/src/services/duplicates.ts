import fs from 'fs';
import type { Duplicate } from '../config/types.js';
import { splitEnvLines, parseEnvLine } from '../core/envLine.js';

/**
 * Scan a .env-like file for duplicate keys.
 * @param filePath - Path to the .env file to scan
 * @returns An array of objects representing duplicate keys and their counts.
 */
export function findDuplicateKeys(filePath: string): Array<Duplicate> {
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, 'utf8');
  const counts = new Map<string, number>();

  for (const line of splitEnvLines(raw)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    counts.set(parsed.key, (counts.get(parsed.key) ?? 0) + 1);
  }

  const duplicates: Array<Duplicate> = [];
  for (const [key, count] of counts) {
    if (count > 1) duplicates.push({ key, count });
  }
  return duplicates;
}
