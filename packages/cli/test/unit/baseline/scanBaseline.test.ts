import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  BASELINE_FILE,
  getBaselinePath,
  loadBaselineFile,
  writeBaselineFile,
  collectBaselineEntries,
  applyBaselineEntries,
} from '../../../src/baseline/scanBaseline.js';
import type { ScanResult, BaselineEntry } from '../../../src/config/types.js';
import type { SecretFinding } from '../../../src/core/security/secretDetectors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fp(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 12);
}

function makeSecret(file: string, snippet: string): SecretFinding {
  return {
    file,
    snippet,
    line: 1,
    kind: 'pattern',
    message: 'secret',
    severity: 'high',
  };
}

const emptyScanResult: ScanResult = {
  used: [],
  missing: [],
  unused: [],
  secrets: [],
  duplicates: {},
  logged: [],
  stats: {
    filesScanned: 0,
    totalUsages: 0,
    uniqueVariables: 0,
    warningsCount: 0,
    duration: 0,
  },
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanBaseline-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// getBaselinePath
// ---------------------------------------------------------------------------

describe('getBaselinePath', () => {
  it('returns absolute path to baseline file inside cwd', () => {
    const result = getBaselinePath('/some/dir');
    expect(result).toBe(path.resolve('/some/dir', BASELINE_FILE));
  });
});

// ---------------------------------------------------------------------------
// loadBaselineFile
// ---------------------------------------------------------------------------

describe('loadBaselineFile', () => {
  it('returns null when baseline file does not exist', () => {
    expect(loadBaselineFile(tmpDir)).toBeNull();
  });

  it('loads and returns a valid baseline file', async () => {
    await writeBaselineFile(tmpDir, [{ rule: 'missing', key: 'FOO' }]);
    const result = loadBaselineFile(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
    expect(result!.entries).toEqual([{ rule: 'missing', key: 'FOO' }]);
    expect(typeof result!.createdAt).toBe('string');
  });

  it('returns null when file contains invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, BASELINE_FILE), 'not json');
    expect(loadBaselineFile(tmpDir)).toBeNull();
  });

  it('returns null when JSON is valid but missing entries array', () => {
    fs.writeFileSync(
      path.join(tmpDir, BASELINE_FILE),
      JSON.stringify({ version: 1, createdAt: '2024-01-01' }),
    );
    expect(loadBaselineFile(tmpDir)).toBeNull();
  });

  it('returns null when root value is not an object', () => {
    fs.writeFileSync(path.join(tmpDir, BASELINE_FILE), '"just a string"');
    expect(loadBaselineFile(tmpDir)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// writeBaselineFile
// ---------------------------------------------------------------------------

describe('writeBaselineFile', () => {
  it('writes baseline file and returns its absolute path', async () => {
    const entries: BaselineEntry[] = [{ rule: 'unused', key: 'BAR' }];
    const written = await writeBaselineFile(tmpDir, entries);

    expect(written).toBe(path.join(tmpDir, BASELINE_FILE));
    expect(fs.existsSync(written)).toBe(true);
  });

  it('writes valid JSON with version, createdAt, and entries', async () => {
    const entries: BaselineEntry[] = [{ rule: 'missing', key: 'API_KEY' }];
    await writeBaselineFile(tmpDir, entries);

    const raw = fs.readFileSync(path.join(tmpDir, BASELINE_FILE), 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.entries).toEqual(entries);
    expect(typeof parsed.createdAt).toBe('string');
  });

  it('file ends with a newline', async () => {
    await writeBaselineFile(tmpDir, []);
    const raw = fs.readFileSync(path.join(tmpDir, BASELINE_FILE), 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
  });

  it('overwrites an existing baseline file', async () => {
    await writeBaselineFile(tmpDir, [{ rule: 'missing', key: 'OLD' }]);
    await writeBaselineFile(tmpDir, [{ rule: 'unused', key: 'NEW' }]);

    const loaded = loadBaselineFile(tmpDir);
    expect(loaded!.entries).toEqual([{ rule: 'unused', key: 'NEW' }]);
  });
});

// ---------------------------------------------------------------------------
// collectBaselineEntries
// ---------------------------------------------------------------------------

describe('collectBaselineEntries', () => {
  it('returns empty array for a clean scan result', () => {
    expect(collectBaselineEntries(emptyScanResult)).toEqual([]);
  });

  it('collects missing keys', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      missing: ['A', 'B'],
    });
    expect(result).toContainEqual({ rule: 'missing', key: 'A' });
    expect(result).toContainEqual({ rule: 'missing', key: 'B' });
  });

  it('collects unused keys', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      unused: ['X'],
    });
    expect(result).toContainEqual({ rule: 'unused', key: 'X' });
  });

  it('collects logged warnings by variable + file', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      logged: [
        {
          variable: 'API_KEY',
          file: 'src/index.ts',
          line: 10,
          column: 0,
          pattern: 'process.env',
          context: 'console.log(process.env.API_KEY)',
          isLogged: true,
        },
      ],
    });

    expect(result).toContainEqual({
      rule: 'logged',
      key: 'API_KEY',
      file: 'src/index.ts',
    });
  });

  it('collects secrets as fingerprints (no raw value)', () => {
    const secret = makeSecret('src/app.ts', 'TOKEN=abc123');
    const result = collectBaselineEntries({
      ...emptyScanResult,
      secrets: [secret],
    });
    const expected = fp('src/app.ts:TOKEN=abc123');
    expect(result).toContainEqual({
      rule: 'secret',
      key: expected,
      file: 'src/app.ts',
    });
    // raw snippet must not appear in any key
    result.forEach((e) => expect(e.key).not.toContain('TOKEN=abc123'));
  });

  it('collects example-secret warnings', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      exampleWarnings: [
        {
          key: 'DB_PASS',
          value: 'secret',
          reason: 'pattern',
          severity: 'high',
        },
      ],
    });
    expect(result).toContainEqual({ rule: 'example-secret', key: 'DB_PASS' });
  });

  it('collects env duplicate keys', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      duplicates: { env: [{ key: 'DUP', count: 2 }] },
    });
    expect(result).toContainEqual({ rule: 'duplicate-env', key: 'DUP' });
  });

  it('collects example duplicate keys', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      duplicates: { example: [{ key: 'EX_DUP', count: 2 }] },
    });
    expect(result).toContainEqual({ rule: 'duplicate-example', key: 'EX_DUP' });
  });

  it('collects framework warnings with file', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      frameworkWarnings: [
        {
          variable: 'NEXT_VAR',
          file: 'pages/index.ts',
          line: 5,
          reason: 'bad',
          framework: 'nextjs',
        },
      ],
    });
    expect(result).toContainEqual({
      rule: 'framework',
      key: 'NEXT_VAR',
      file: 'pages/index.ts',
    });
  });

  it('collects uppercase warnings', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      uppercaseWarnings: [{ key: 'myKey', suggestion: 'MYKEY' }],
    });
    expect(result).toContainEqual({ rule: 'uppercase', key: 'myKey' });
  });

  it('collects expire warnings', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      expireWarnings: [{ key: 'OLD_KEY', date: '2024-01-01', daysLeft: -5 }],
    });
    expect(result).toContainEqual({ rule: 'expire', key: 'OLD_KEY' });
  });

  it('collects inconsistent-naming warnings as sorted key pair', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      inconsistentNamingWarnings: [
        { key1: 'SECRETKEY', key2: 'SECRET_KEY', suggestion: '' },
      ],
    });
    // sorted: SECRETKEY|SECRET_KEY  ('K' < '_' in ASCII so SECRETKEY < SECRET_KEY)
    expect(result).toContainEqual({
      rule: 'inconsistent-naming',
      key: 'SECRETKEY|SECRET_KEY',
    });
  });

  it('key pair is identical regardless of key1/key2 order', () => {
    const a = collectBaselineEntries({
      ...emptyScanResult,
      inconsistentNamingWarnings: [
        { key1: 'B_KEY', key2: 'BKEY', suggestion: '' },
      ],
    });
    const b = collectBaselineEntries({
      ...emptyScanResult,
      inconsistentNamingWarnings: [
        { key1: 'BKEY', key2: 'B_KEY', suggestion: '' },
      ],
    });
    expect(a).toEqual(b);
  });

  it('returns entries sorted by rule, then file, then key', () => {
    const result = collectBaselineEntries({
      ...emptyScanResult,
      missing: ['Z', 'A'],
      unused: ['M'],
    });
    const rules = result.map((e) => e.rule);
    // missing < unused alphabetically
    expect(rules.indexOf('missing')).toBeLessThan(rules.indexOf('unused'));
    // A before Z within missing
    const missingKeys = result
      .filter((e) => e.rule === 'missing')
      .map((e) => e.key);
    expect(missingKeys).toEqual(['A', 'Z']);
  });

  it('sorts entries with same rule by file before key', () => {
    // Two framework warnings with same rule but different files
    const result = collectBaselineEntries({
      ...emptyScanResult,
      frameworkWarnings: [
        {
          variable: 'VAR',
          file: 'z-page.ts',
          line: 1,
          reason: 'r',
          framework: 'nextjs',
        },
        {
          variable: 'VAR',
          file: 'a-page.ts',
          line: 2,
          reason: 'r',
          framework: 'nextjs',
        },
      ],
    });
    const files = result.map((e) => e.file);
    expect(files).toEqual(['a-page.ts', 'z-page.ts']);
  });

  it('two secrets with the same content produce the same fingerprint', () => {
    const s1 = makeSecret('file.ts', 'SNIPPET=x');
    const s2 = makeSecret('file.ts', 'SNIPPET=x');
    const r1 = collectBaselineEntries({ ...emptyScanResult, secrets: [s1] });
    const r2 = collectBaselineEntries({ ...emptyScanResult, secrets: [s2] });
    expect(r1[0]!.key).toBe(r2[0]!.key);
  });
});

// ---------------------------------------------------------------------------
// applyBaselineEntries
// ---------------------------------------------------------------------------

describe('applyBaselineEntries', () => {
  it('returns scan result unchanged when entries list is empty', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      missing: ['A'],
      unused: ['B'],
    };
    const after = applyBaselineEntries(result, []);
    expect(after.missing).toEqual(['A']);
    expect(after.unused).toEqual(['B']);
  });

  it('suppresses matching missing key', () => {
    const result: ScanResult = { ...emptyScanResult, missing: ['FOO', 'BAR'] };
    const entries: BaselineEntry[] = [{ rule: 'missing', key: 'FOO' }];
    const after = applyBaselineEntries(result, entries);
    expect(after.missing).toEqual(['BAR']);
  });

  it('suppresses matching unused key', () => {
    const result: ScanResult = { ...emptyScanResult, unused: ['OLD', 'KEEP'] };
    const entries: BaselineEntry[] = [{ rule: 'unused', key: 'OLD' }];
    const after = applyBaselineEntries(result, entries);
    expect(after.unused).toEqual(['KEEP']);
  });

  it('suppresses logged warning by variable + file', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      logged: [
        {
          variable: 'API_KEY',
          file: 'src/index.ts',
          line: 11,
          column: 0,
          pattern: 'process.env',
          context: 'console.log(process.env.API_KEY)',
          isLogged: true,
        },
      ],
    };
    const entries: BaselineEntry[] = [
      { rule: 'logged', key: 'API_KEY', file: 'src/index.ts' },
    ];
    const after = applyBaselineEntries(result, entries);
    expect(after.logged).toHaveLength(0);
  });

  it('keeps logged warning when file does not match', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      logged: [
        {
          variable: 'API_KEY',
          file: 'src/index.ts',
          line: 11,
          column: 0,
          pattern: 'process.env',
          context: 'console.log(process.env.API_KEY)',
          isLogged: true,
        },
      ],
    };
    const entries: BaselineEntry[] = [
      { rule: 'logged', key: 'API_KEY', file: 'src/other.ts' },
    ];
    const after = applyBaselineEntries(result, entries);
    expect(after.logged).toHaveLength(1);
  });

  it('suppresses secret by fingerprint', () => {
    const secret = makeSecret('src/index.ts', 'TOKEN=secret');
    const result: ScanResult = { ...emptyScanResult, secrets: [secret] };
    const entries = collectBaselineEntries(result); // derive matching entries
    const after = applyBaselineEntries(result, entries);
    expect(after.secrets).toHaveLength(0);
  });

  it('keeps secret that does not match baseline fingerprint', () => {
    const secret = makeSecret('src/index.ts', 'TOKEN=secret');
    const otherEntries: BaselineEntry[] = [
      { rule: 'secret', key: fp('other.ts:OTHER=val'), file: 'other.ts' },
    ];
    const result: ScanResult = { ...emptyScanResult, secrets: [secret] };
    const after = applyBaselineEntries(result, otherEntries);
    expect(after.secrets).toHaveLength(1);
  });

  it('suppresses duplicate-env key', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      duplicates: { env: [{ key: 'DUP', count: 2 }] },
    };
    const entries: BaselineEntry[] = [{ rule: 'duplicate-env', key: 'DUP' }];
    const after = applyBaselineEntries(result, entries);
    expect(after.duplicates.env).toHaveLength(0);
  });

  it('suppresses duplicate-example key', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      duplicates: { example: [{ key: 'EX', count: 2 }] },
    };
    const entries: BaselineEntry[] = [{ rule: 'duplicate-example', key: 'EX' }];
    const after = applyBaselineEntries(result, entries);
    expect(after.duplicates.example).toHaveLength(0);
  });

  it('leaves duplicates undefined when scanResult has no duplicates', () => {
    const result: ScanResult = { ...emptyScanResult, duplicates: {} };
    const after = applyBaselineEntries(result, []);
    expect(after.duplicates.env).toBeUndefined();
    expect(after.duplicates.example).toBeUndefined();
  });

  it('suppresses example-secret warning', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      exampleWarnings: [
        { key: 'DB_PASS', value: 'x', reason: 'pattern', severity: 'high' },
      ],
    };
    const entries: BaselineEntry[] = [
      { rule: 'example-secret', key: 'DB_PASS' },
    ];
    const after = applyBaselineEntries(result, entries);
    expect(after.exampleWarnings).toHaveLength(0);
  });

  it('does not touch exampleWarnings when field is absent', () => {
    const result: ScanResult = { ...emptyScanResult };
    const after = applyBaselineEntries(result, [
      { rule: 'example-secret', key: 'X' },
    ]);
    expect(after.exampleWarnings).toBeUndefined();
  });

  it('suppresses framework warning by variable + file', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      frameworkWarnings: [
        {
          variable: 'NEXT_VAR',
          file: 'pages/i.ts',
          line: 1,
          reason: 'bad',
          framework: 'nextjs',
        },
      ],
    };
    const entries: BaselineEntry[] = [
      { rule: 'framework', key: 'NEXT_VAR', file: 'pages/i.ts' },
    ];
    const after = applyBaselineEntries(result, entries);
    expect(after.frameworkWarnings).toHaveLength(0);
  });

  it('keeps framework warning when file does not match', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      frameworkWarnings: [
        {
          variable: 'NEXT_VAR',
          file: 'pages/other.ts',
          line: 1,
          reason: 'bad',
          framework: 'nextjs',
        },
      ],
    };
    const entries: BaselineEntry[] = [
      { rule: 'framework', key: 'NEXT_VAR', file: 'pages/i.ts' },
    ];
    const after = applyBaselineEntries(result, entries);
    expect(after.frameworkWarnings).toHaveLength(1);
  });

  it('does not touch frameworkWarnings when field is absent', () => {
    const result: ScanResult = { ...emptyScanResult };
    const after = applyBaselineEntries(result, [
      { rule: 'framework', key: 'X', file: 'f.ts' },
    ]);
    expect(after.frameworkWarnings).toBeUndefined();
  });

  it('suppresses uppercase warning', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      uppercaseWarnings: [{ key: 'myKey', suggestion: 'MYKEY' }],
    };
    const entries: BaselineEntry[] = [{ rule: 'uppercase', key: 'myKey' }];
    const after = applyBaselineEntries(result, entries);
    expect(after.uppercaseWarnings).toHaveLength(0);
  });

  it('does not touch uppercaseWarnings when field is absent', () => {
    const result: ScanResult = { ...emptyScanResult };
    const after = applyBaselineEntries(result, [
      { rule: 'uppercase', key: 'x' },
    ]);
    expect(after.uppercaseWarnings).toBeUndefined();
  });

  it('suppresses expire warning', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      expireWarnings: [{ key: 'OLD_KEY', date: '2020-01-01', daysLeft: -100 }],
    };
    const entries: BaselineEntry[] = [{ rule: 'expire', key: 'OLD_KEY' }];
    const after = applyBaselineEntries(result, entries);
    expect(after.expireWarnings).toHaveLength(0);
  });

  it('does not touch expireWarnings when field is absent', () => {
    const result: ScanResult = { ...emptyScanResult };
    const after = applyBaselineEntries(result, [{ rule: 'expire', key: 'x' }]);
    expect(after.expireWarnings).toBeUndefined();
  });

  it('suppresses inconsistent-naming warning (sorted pair)', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      inconsistentNamingWarnings: [
        { key1: 'SECRETKEY', key2: 'SECRET_KEY', suggestion: '' },
      ],
    };
    const entries: BaselineEntry[] = [
      { rule: 'inconsistent-naming', key: 'SECRETKEY|SECRET_KEY' },
    ];
    const after = applyBaselineEntries(result, entries);
    expect(after.inconsistentNamingWarnings).toHaveLength(0);
  });

  it('does not touch inconsistentNamingWarnings when field is absent', () => {
    const result: ScanResult = { ...emptyScanResult };
    const after = applyBaselineEntries(result, [
      { rule: 'inconsistent-naming', key: 'A|B' },
    ]);
    expect(after.inconsistentNamingWarnings).toBeUndefined();
  });

  it('only suppresses matched entries, keeps unmatched ones', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      missing: ['KEEP', 'SUPPRESS'],
    };
    const entries: BaselineEntry[] = [{ rule: 'missing', key: 'SUPPRESS' }];
    const after = applyBaselineEntries(result, entries);
    expect(after.missing).toEqual(['KEEP']);
  });

  it('round-trips: collect then apply removes all warnings', () => {
    const result: ScanResult = {
      ...emptyScanResult,
      missing: ['A'],
      unused: ['B'],
      logged: [
        {
          variable: 'LOG_KEY',
          file: 'f.ts',
          line: 1,
          column: 0,
          pattern: 'process.env',
          context: 'console.log(process.env.LOG_KEY)',
          isLogged: true,
        },
      ],
      secrets: [makeSecret('f.ts', 'S=x')],
      exampleWarnings: [
        { key: 'K', value: 'v', reason: 'r', severity: 'medium' },
      ],
      duplicates: {
        env: [{ key: 'D', count: 2 }],
        example: [{ key: 'E', count: 2 }],
      },
      frameworkWarnings: [
        {
          variable: 'V',
          file: 'f.ts',
          line: 1,
          reason: 'r',
          framework: 'nextjs',
        },
      ],
      uppercaseWarnings: [{ key: 'u', suggestion: 'U' }],
      expireWarnings: [{ key: 'OLD', date: '2020-01-01', daysLeft: -1 }],
      inconsistentNamingWarnings: [
        { key1: 'X_KEY', key2: 'XKEY', suggestion: '' },
      ],
    };

    const entries = collectBaselineEntries(result);
    const after = applyBaselineEntries(result, entries);

    expect(after.missing).toHaveLength(0);
    expect(after.unused).toHaveLength(0);
    expect(after.logged).toHaveLength(0);
    expect(after.secrets).toHaveLength(0);
    expect(after.exampleWarnings).toHaveLength(0);
    expect(after.duplicates.env).toHaveLength(0);
    expect(after.duplicates.example).toHaveLength(0);
    expect(after.frameworkWarnings).toHaveLength(0);
    expect(after.uppercaseWarnings).toHaveLength(0);
    expect(after.expireWarnings).toHaveLength(0);
    expect(after.inconsistentNamingWarnings).toHaveLength(0);
  });
});
