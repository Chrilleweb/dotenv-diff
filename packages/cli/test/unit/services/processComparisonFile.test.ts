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

vi.mock('../../../src/services/duplicates.js', () => ({
  findDuplicateKeys: vi.fn(() => [{ key: 'A', count: 2 }]),
}));

vi.mock('../../../src/services/fixEnv.js', () => ({
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

vi.mock('../../../src/services/detectMissingComments.js', () => ({
  detectMissingComments: vi.fn(() => [{ key: 'UNDOC', line: 2 }]),
}));

vi.mock('../../../src/services/detectOptionalKeys.js', () => ({
  detectOptionalKeys: vi.fn(() => []),
}));

vi.mock('../../../src/services/detectExampleDrift.js', () => ({
  detectExampleDrift: vi.fn(() => [
    { key: 'DRIFTED', envFile: '.env', exampleFile: '.env.example' },
  ]),
}));

import fs from 'fs';
import { processComparisonFile } from '../../../src/services/processComparisonFile.js';
import { applyFixes } from '../../../src/services/fixEnv.js';
import { parseEnvFile } from '../../../src/services/parseEnvFile.js';
import { findDuplicateKeys } from '../../../src/services/duplicates.js';
import { resolveFromCwd } from '../../../src/core/helpers/resolveFromCwd.js';
import { detectOptionalKeys } from '../../../src/services/detectOptionalKeys.js';
import { detectExampleDrift } from '../../../src/services/detectExampleDrift.js';

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
    // clearAllMocks keeps implementations, so restore the default explicitly —
    // a test that stubs existsSync would otherwise leak into the next one.
    vi.mocked(fs.existsSync).mockReturnValue(true);
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

  it('detects comment warnings on the example file when enabled', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      commentWarnings: true,
    });

    expect(result.commentWarnings).toEqual([{ key: 'UNDOC', line: 2 }]);
  });

  it('detects drift against the comparison file when enabled', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      driftWarnings: true,
    });

    expect(detectExampleDrift).toHaveBeenCalledWith(
      expect.objectContaining({ comparisonPath: compareFile.path }),
    );
    expect(result.driftWarnings).toEqual([
      { key: 'DRIFTED', envFile: '.env', exampleFile: '.env.example' },
    ]);
  });

  it('skips drift detection when disabled', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      driftWarnings: false,
    });

    expect(detectExampleDrift).not.toHaveBeenCalled();
    expect(result.driftWarnings).toEqual([]);
  });

  it('falls back to the default example file and skips when it does not exist', () => {
    // examplePath undefined → resolves DEFAULT_EXAMPLE_FILE; nothing on disk → no detection.
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      examplePath: undefined,
      commentWarnings: true,
    });

    expect(result.commentWarnings).toEqual([]);
    expect(result.exampleFull).toBeUndefined();
  });

  it('does not report a key marked @optional in the example file as missing', () => {
    // An optional key may be left out of the env file entirely.
    vi.mocked(detectOptionalKeys).mockReturnValueOnce(['NEW_KEY']);

    const result = processComparisonFile(
      { ...baseScanResult, missing: ['NEW_KEY', 'REQUIRED_KEY'] },
      compareFile,
      baseOpts,
    );

    expect(result.scanResult.missing).toEqual(['REQUIRED_KEY']);
  });

  it('drops typo suggestions for keys marked @optional', () => {
    vi.mocked(detectOptionalKeys).mockReturnValueOnce(['NEW_KEY']);

    const result = processComparisonFile(
      {
        ...baseScanResult,
        suggestions: [
          { key: 'NEW_KEY', didYouMean: 'NEW_KEYS', distance: 1 },
          { key: 'OTHER', didYouMean: 'OTHERS', distance: 1 },
        ],
      },
      compareFile,
      baseOpts,
    );

    expect(result.scanResult.suggestions).toEqual([
      { key: 'OTHER', didYouMean: 'OTHERS', distance: 1 },
    ]);
  });

  it('detects duplicates when not allowed', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      allowDuplicates: false,
    });

    expect(result.duplicates.length).toBeGreaterThan(0);
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

    expect(result.scanResult.duplicates?.keys).toBeDefined();
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

  it('resolves the example file even without the examplePath option', () => {
    // The example beside the comparison file is loaded regardless of --example,
    // so the checks that read it are not silently off without the flag.
    const opts: ScanUsageOptions = { ...baseOpts, examplePath: undefined };

    const result = processComparisonFile(baseScanResult, compareFile, opts);

    expect(result.error).toBeUndefined();
    expect(result.exampleFull).toEqual({ A: '1', bKey: '2' });
  });

  it('reports duplicates once, against the file the scan actually read', () => {
    const exampleFile: ComparisonFile = {
      path: '/env/.env.example',
      name: '.env.example',
    };

    const result = processComparisonFile(
      { ...baseScanResult, duplicates: {} },
      exampleFile,
      { ...baseOpts, allowDuplicates: false, examplePath: '.env.example' },
    );

    // The example file IS the comparison file here, so its duplicates must be
    // reported under that name — not counted a second time as "env" duplicates.
    expect(findDuplicateKeys).toHaveBeenCalledTimes(1);
    expect(result.scanResult.duplicates.file).toBe('.env.example');
    expect(result.scanResult.duplicates.keys).toHaveLength(1);
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
    expect(result.scanResult.duplicates?.keys).toBeDefined();
  });

  it('does not set exampleFull when example file does not exist on disk (line 74)', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    const result = processComparisonFile(baseScanResult, compareFile, baseOpts);

    expect(result.exampleFull).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('tests duplicate keys against ignoreRegex patterns', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      allowDuplicates: false,
      ignoreRegex: [/^ZZZ_/],
    });

    // The duplicate key ('A') doesn't match the regex, so it's kept.
    expect(result.duplicates.length).toBeGreaterThan(0);
  });

  it('skips duplicate check when allowDuplicates is true (lines 105-109)', () => {
    const result = processComparisonFile(baseScanResult, compareFile, {
      ...baseOpts,
      allowDuplicates: true,
    });

    expect(result.duplicates).toHaveLength(0);
  });

  it('leaves duplicates unset when the comparison file has none', () => {
    vi.mocked(findDuplicateKeys).mockReturnValueOnce([]);

    // Use a fresh duplicates object to avoid mutation from previous tests
    const result = processComparisonFile(
      { ...baseScanResult, duplicates: {} },
      compareFile,
      { ...baseOpts, allowDuplicates: false },
    );

    expect(result.duplicates).toHaveLength(0);
    expect(result.scanResult.duplicates?.keys).toBeUndefined();
    expect(result.scanResult.duplicates?.file).toBeUndefined();
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
    expect(result.scanResult.duplicates?.keys).toBeDefined();
  });
});
