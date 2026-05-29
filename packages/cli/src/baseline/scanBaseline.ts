import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  BaselineEntry,
  BaselineFile,
  ScanResult,
} from '../config/types.js';

export const BASELINE_FILE = 'dotenv-diff.baseline.json';
const BASELINE_VERSION = 1;

/**
 * Returns the absolute path to the baseline file for a given working directory.
 */
export function getBaselinePath(cwd: string): string {
  return path.resolve(cwd, BASELINE_FILE);
}

/**
 * Loads the baseline file from disk. Returns null if the file does not exist
 * or cannot be parsed into a valid shape.
 */
export function loadBaselineFile(cwd: string): BaselineFile | null {
  const filePath = getBaselinePath(cwd);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      Array.isArray((parsed as { entries?: unknown }).entries)
    ) {
      return parsed as BaselineFile;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Writes a baseline file to disk and returns the absolute path it was written to.
 */
export async function writeBaselineFile(
  cwd: string,
  entries: BaselineEntry[],
): Promise<string> {
  const filePath = getBaselinePath(cwd);
  const payload: BaselineFile = {
    version: BASELINE_VERSION,
    createdAt: new Date().toISOString(),
    entries,
  };
  await fs.promises.writeFile(
    filePath,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  );
  return filePath;
}

/**
 * Converts a ScanResult into a deterministic list of baseline entries.
 *
 * Identifiers are chosen to be stable across runs — volatile fields like line
 * numbers and snippet text are excluded. Secrets are stored as a fingerprint
 * (SHA-256 truncated to 12 hex chars) of `file:snippet` so no secret value is
 * ever written to the baseline file.
 */
export function collectBaselineEntries(
  scanResult: ScanResult,
): BaselineEntry[] {
  const entries: BaselineEntry[] = [];

  for (const key of scanResult.missing) {
    entries.push({ rule: 'missing', key });
  }

  for (const key of scanResult.unused) {
    entries.push({ rule: 'unused', key });
  }

  for (const secret of scanResult.secrets) {
    entries.push({
      rule: 'secret',
      key: fingerprint(`${secret.file}:${secret.snippet}`),
      file: secret.file,
    });
  }

  for (const warning of scanResult.exampleWarnings ?? []) {
    entries.push({ rule: 'example-secret', key: warning.key });
  }

  for (const dup of scanResult.duplicates.env ?? []) {
    entries.push({ rule: 'duplicate-env', key: dup.key });
  }

  for (const dup of scanResult.duplicates.example ?? []) {
    entries.push({ rule: 'duplicate-example', key: dup.key });
  }

  // variable + file uniquely identifies a framework warning without line numbers
  for (const warning of scanResult.frameworkWarnings ?? []) {
    entries.push({
      rule: 'framework',
      key: warning.variable,
      file: warning.file,
    });
  }

  for (const warning of scanResult.uppercaseWarnings ?? []) {
    entries.push({ rule: 'uppercase', key: warning.key });
  }

  for (const warning of scanResult.expireWarnings ?? []) {
    entries.push({ rule: 'expire', key: warning.key });
  }

  // Sort the key pair so the entry is identical regardless of scanner order
  for (const warning of scanResult.inconsistentNamingWarnings ?? []) {
    const pair = [warning.key1, warning.key2].sort().join('|');
    entries.push({ rule: 'inconsistent-naming', key: pair });
  }

  return sortEntries(entries);
}

/**
 * Returns a new ScanResult with every warning that is covered by a baseline
 * entry removed. The matching logic is the mirror image of
 * {@link collectBaselineEntries} so every entry written suppresses the
 * correct warning.
 */
export function applyBaselineEntries(
  scanResult: ScanResult,
  entries: BaselineEntry[],
): ScanResult {
  const has = (rule: string, key: string, file?: string): boolean =>
    entries.some(
      (e) =>
        e.rule === rule && e.key === key && (file == null || e.file === file),
    );

  return {
    ...scanResult,
    missing: scanResult.missing.filter((k) => !has('missing', k)),
    unused: scanResult.unused.filter((k) => !has('unused', k)),
    secrets: scanResult.secrets.filter(
      (s) => !has('secret', fingerprint(`${s.file}:${s.snippet}`)),
    ),
    duplicates: {
      ...(scanResult.duplicates.env != null && {
        env: scanResult.duplicates.env.filter(
          (d) => !has('duplicate-env', d.key),
        ),
      }),
      ...(scanResult.duplicates.example != null && {
        example: scanResult.duplicates.example.filter(
          (d) => !has('duplicate-example', d.key),
        ),
      }),
    },
    ...(scanResult.exampleWarnings != null && {
      exampleWarnings: scanResult.exampleWarnings.filter(
        (w) => !has('example-secret', w.key),
      ),
    }),
    ...(scanResult.frameworkWarnings != null && {
      frameworkWarnings: scanResult.frameworkWarnings.filter(
        (w) => !has('framework', w.variable, w.file),
      ),
    }),
    ...(scanResult.uppercaseWarnings != null && {
      uppercaseWarnings: scanResult.uppercaseWarnings.filter(
        (w) => !has('uppercase', w.key),
      ),
    }),
    ...(scanResult.expireWarnings != null && {
      expireWarnings: scanResult.expireWarnings.filter(
        (w) => !has('expire', w.key),
      ),
    }),
    ...(scanResult.inconsistentNamingWarnings != null && {
      inconsistentNamingWarnings: scanResult.inconsistentNamingWarnings.filter(
        (w) => {
          const pair = [w.key1, w.key2].sort().join('|');
          return !has('inconsistent-naming', pair);
        },
      ),
    }),
  };
}

/**
 * SHA-256 fingerprint truncated to 12 hex chars. Stable across runs; used for
 * secrets so no secret value is ever committed to the baseline file.
 */
function fingerprint(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 12);
}

function sortEntries(entries: BaselineEntry[]): BaselineEntry[] {
  return [...entries].sort((a, b) => {
    if (a.rule !== b.rule) return a.rule.localeCompare(b.rule);
    const fileA = a.file ?? '';
    const fileB = b.file ?? '';
    if (fileA !== fileB) return fileA.localeCompare(fileB);
    return a.key.localeCompare(b.key);
  });
}
