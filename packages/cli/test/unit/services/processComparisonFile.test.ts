import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ScanResult,
  ScanUsageOptions,
  ComparisonFile,
} from '../../../src/config/types.js';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
  },
}));

vi.mock('../../../src/services/parseEnvFile.js', () => ({
  parseEnvFile: vi.fn(() => ({ A: '1', bKey: '2' })),
}));

vi.mock('../../../src/core/filterIgnoredKeys.js', () => ({
  filterIgnoredKeys: vi.fn((keys) => keys),
}));

vi.mock('../../../src/core/scan/compareScan.js', () => ({
  compareWithEnvFiles: vi.fn((scan) => scan),
}));

vi.mock('../../../src/core/duplicates.js', () => ({
  findDuplicateKeys: vi.fn(() => [{ key: 'A', count: 2 }]),
}));

vi.mock('../../../src/core/fixEnv.js', () => ({
  applyFixes: vi.fn(() => ({
    changed: true,
    result: {
      removedDuplicates: ['A'],
      addedEnv: ['NEW_KEY'],
      gitignoreUpdated: true,
    },
  })),
}));

vi.mock('../../../src/core/helpers/toUpperSnakeCase.js', () => ({
  toUpperSnakeCase: vi.fn((k) => k.toUpperCase()),
}));

vi.mock('../../../src/core/helpers/resolveFromCwd.js', () => ({
  resolveFromCwd: vi.fn((_, p) => p),
}));

vi.mock('../../../src/services/detectEnvExpirations.js', () => ({
  detectEnvExpirations: vi.fn(() => [{ key: 'EXPIRE', message: 'expired' }]),
}));

vi.mock('../../../src/core/detectInconsistentNaming.js', () => ({
  detectInconsistentNaming: vi.fn(() => [
    { key1: 'A', key2: 'B', suggestion: 'A_B' },
  ]),
}));

import fs from 'fs';
import { processComparisonFile } from '../../../src/services/processComparisonFile.js';
import { applyFixes } from '../../../src/core/fixEnv.js';
import { parseEnvFile } from '../../../src/services/parseEnvFile.js';
import { findDuplicateKeys } from '../../../src/core/duplicates.js';
import { resolveFromCwd } from '../../../src/core/helpers/resolveFromCwd.js';

describe('processComparisonFile', () => {
  const baseScanResult: ScanResult = {
    used: [],
    missing: ['NEW_KEY'],
    unused: [],
    stats: {
      filesScanned: 1,
      totalUsages: 0,
      uniqueVariables: 0,
      warningsCount: 0,
      duration: 0,
    },
    secrets: [],
    duplicates: {},
    logged: [],
  };

  const compareFile: ComparisonFile = {
    path: '/env/.env',
    name: '.env',
  };

  const baseOpts: ScanUsageOptions = {
    cwd: '/root',
    examplePath: '.env.example',
    include: [],
    exclude: [],
    ignore: [],
    ignoreRegex: [],
    secrets: false,
    json: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveFromCwd).mockImplementation((_, p) => p);
  });

  it('processes normally without fix', () => {
    const result = processComparisonFile(baseScanResult, compareFile, baseOpts);

    expect(result.comparedAgainst).toBe('.env');
    expect(result.error).toBeUndefined();
  });

  it('detects uppercase warnings', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      uppercaseKeys: true,
    });

    expect(result.uppercaseWarnings?.length).toBeGreaterThan(0);
  });

  it('detects duplicates when not allowed', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      allowDuplicates: false,
    });

    expect(result.dupsEnv.length).toBeGreaterThan(0);
  });

  it('detects expire warnings', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      expireWarnings: true,
    });

    expect(result.expireWarnings?.length).toBeGreaterThan(0);
  });

  it('detects inconsistent naming', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      inconsistentNamingWarnings: true,
    });

    expect(result.inconsistentNamingWarnings?.length).toBeGreaterThan(0);
  });

  it('applies fixes when fix enabled', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      fix: true,
    });

    expect(applyFixes).toHaveBeenCalled();
    expect(result.fix.fixApplied).toBe(true);
    expect(result.scanResult.missing.length).toBe(0);
  });

  it('keeps duplicates when fix does not change anything', () => {
    vi.mocked(applyFixes).mockReturnValueOnce({
      changed: false,
      result: {
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
    });

    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      allowDuplicates: false,
    });

    expect(result.scanResult.duplicates?.env).toBeDefined();
  });

  it('Will Load .env.example trough examplePath', () => {
    const exampleFile: ComparisonFile = {
      path: '/env/.env.example',
      name: '.env.example',
    };
    const result = processComparisonFile(baseScanResult, exampleFile, {
      ...baseOpts,
      examplePath: '.env.example',
    });

    expect(result.comparedAgainst).toBe('.env.example');
  });

  it('returns error result when file cannot be read', () => {
    vi.mocked(parseEnvFile).mockImplementationOnce(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    const result = processComparisonFile(baseScanResult, compareFile, baseOpts);

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Could not read .env');
    expect(result.error?.shouldExit).toBe(false);
  });

  it('sets shouldExit true on error when isCiMode is enabled', () => {
    vi.mocked(parseEnvFile).mockImplementationOnce(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      isCiMode: true,
    });

    expect(result.error?.shouldExit).toBe(true);
  });

  it('works without examplePath option', () => {
    const opts: ScanUsageOptions = { ...baseOpts, examplePath: undefined };

    const result = processComparisonFile(baseScanResult, compareFile, opts);

    expect(result.error).toBeUndefined();
    expect(result.exampleFull).toBeUndefined();
  });

  it('skips example duplicate check when examplePath equals compareFile path', async () => {
    // resolveFromCwd returns the compareFile path → same file → skip
    const { resolveFromCwd } =
      await import('../../../src/core/helpers/resolveFromCwd.js');
    vi.mocked(resolveFromCwd).mockReturnValue(compareFile.path);

    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      allowDuplicates: false,
      examplePath: '.env.example',
    });

    // dupsEnv still found, but dupsEx should be empty because same file
    expect(result.dupsEx).toHaveLength(0);
  });

  it('does not clear state when fix returns changed=false', () => {
    vi.mocked(applyFixes).mockReturnValueOnce({
      changed: false,
      result: {
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
    });

    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      fix: true,
      allowDuplicates: false,
    });

    expect(result.fix.fixApplied).toBe(false);
    // duplicates should still be present on scanResult
    expect(result.scanResult.duplicates?.env).toBeDefined();
  });

  it('does not set exampleFull when example file does not exist on disk (line 74)', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    const result = processComparisonFile(baseScanResult, compareFile, baseOpts);

    expect(result.exampleFull).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('skips duplicate check when allowDuplicates is true (lines 105-109)', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      allowDuplicates: true,
    });

    expect(result.dupsEnv).toHaveLength(0);
    expect(result.dupsEx).toHaveLength(0);
    expect(result.duplicatesFound).toBe(false);
  });

  it('sets duplicatesFound via dupsEx when only example file has duplicates (lines 109, 154)', () => {
    // First call: env file → no duplicates. Second call: example file → has duplicate.
    vi.mocked(findDuplicateKeys)
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ key: 'EX_KEY', count: 2 }]);

    // Use a fresh duplicates object to avoid mutation from previous tests
    const result = processComparisonFile(
      { ...baseScanResult, duplicates: {} },
      compareFile,
      { ...baseOpts, allowDuplicates: false },
    );

    expect(result.duplicatesFound).toBe(true);
    expect(result.dupsEnv).toHaveLength(0);
    expect(result.dupsEx).toHaveLength(1);
    // dupsEnv is empty → scanResult.duplicates.env NOT set (line 154 false branch)
    expect(result.scanResult.duplicates?.env).toBeUndefined();
    // dupsEx has items → scanResult.duplicates.example IS set
    expect(result.scanResult.duplicates?.example).toBeDefined();
  });

  it('uses empty exampleKeysList when exampleFull is undefined in inconsistent naming check (line 119)', () => {
    // existsSync returns false → exampleFull never set → exampleKeysList = []
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      inconsistentNamingWarnings: true,
    });

    expect(result.exampleFull).toBeUndefined();
    expect(result.inconsistentNamingWarnings?.length).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('initialises scanResult.duplicates if it was undefined before writing', () => {
    const scanWithNoDuplicates: ScanResult = {
      ...baseScanResult,
      duplicates: undefined as unknown as ScanResult['duplicates'],
    };

    const result = processComparisonFile(scanWithNoDuplicates, compareFile, {
      ...baseOpts,
      allowDuplicates: false,
      fix: false,
    });

    expect(result.scanResult.duplicates).toBeDefined();
    expect(result.scanResult.duplicates?.env).toBeDefined();
  });
});
