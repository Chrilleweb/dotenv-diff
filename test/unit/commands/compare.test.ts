import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { compareMany } from '../../../src/commands/compare.js';
import type {
  FilePair,
  ComparisonOptions,
  CompareJsonEntry,
} from '../../../src/config/types.js';

// ---- mocks ----
vi.mock('../../../src/core/parseEnv.js', () => ({
  parseEnvFile: vi.fn(),
}));

vi.mock('../../../src/core/diffEnv.js', () => ({
  diffEnv: vi.fn(),
}));

vi.mock('../../../src/services/git.js', () => ({
  checkGitignoreStatus: vi.fn(),
}));

vi.mock('../../../src/core/duplicates.js', () => ({
  findDuplicateKeys: vi.fn(),
}));

vi.mock('../../../src/core/filterIgnoredKeys.js', () => ({
  filterIgnoredKeys: vi.fn((keys) => keys),
}));

vi.mock('../../../src/core/compare/updateTotals.js', () => ({
  updateTotals: vi.fn(() => false),
}));

vi.mock('../../../src/core/fixEnv.js', () => ({
  applyFixes: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printFixTips.js', () => ({
  printFixTips: vi.fn(),
}));

vi.mock('../../../src/ui/compare/printStats.js', () => ({
  printStats: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printDuplicates.js', () => ({
  printDuplicates: vi.fn(),
}));

vi.mock('../../../src/ui/compare/printHeader.js', () => ({
  printHeader: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printAutoFix.js', () => ({
  printAutoFix: vi.fn(),
}));

vi.mock('../../../src/ui/compare/printIssues.js', () => ({
  printIssues: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printSuccess.js', () => ({
  printSuccess: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printGitignore.js', () => ({
  printGitignoreWarning: vi.fn(),
}));

vi.mock('../../../src/ui/compare/compareJsonOutput.js', () => ({
  compareJsonOutput: vi.fn((params) => params),
}));

vi.mock('../../../src/ui/compare/printErrorNotFound.js', () => ({
  printErrorNotFound: vi.fn(),
}));

import { parseEnvFile } from '../../../src/core/parseEnv.js';
import { diffEnv } from '../../../src/core/diffEnv.js';
import { checkGitignoreStatus } from '../../../src/services/git.js';
import { findDuplicateKeys } from '../../../src/core/duplicates.js';
import { filterIgnoredKeys } from '../../../src/core/filterIgnoredKeys.js';
import { updateTotals } from '../../../src/core/compare/updateTotals.js';
import { applyFixes } from '../../../src/core/fixEnv.js';
import { printFixTips } from '../../../src/ui/shared/printFixTips.js';
import { printStats } from '../../../src/ui/compare/printStats.js';
import { printDuplicates } from '../../../src/ui/shared/printDuplicates.js';
import { printHeader } from '../../../src/ui/compare/printHeader.js';
import { printAutoFix } from '../../../src/ui/shared/printAutoFix.js';
import { printIssues } from '../../../src/ui/compare/printIssues.js';
import { printSuccess } from '../../../src/ui/shared/printSuccess.js';
import { printGitignoreWarning } from '../../../src/ui/shared/printGitignore.js';
import { compareJsonOutput } from '../../../src/ui/compare/compareJsonOutput.js';
import { printErrorNotFound } from '../../../src/ui/compare/printErrorNotFound.js';

describe('compareMany', () => {
  let cwd: string;
  let envPath: string;
  let examplePath: string;

  const mockParseEnvFile = parseEnvFile as ReturnType<typeof vi.fn>;
  const mockDiffEnv = diffEnv as ReturnType<typeof vi.fn>;
  const mockCheckGitignoreStatus = checkGitignoreStatus as ReturnType<
    typeof vi.fn
  >;
  const mockFindDuplicateKeys = findDuplicateKeys as ReturnType<typeof vi.fn>;
  const mockFilterIgnoredKeys = filterIgnoredKeys as ReturnType<typeof vi.fn>;
  const mockUpdateTotals = updateTotals as ReturnType<typeof vi.fn>;
  const mockApplyFixes = applyFixes as ReturnType<typeof vi.fn>;
  const mockPrintFixTips = printFixTips as ReturnType<typeof vi.fn>;
  const mockPrintStats = printStats as ReturnType<typeof vi.fn>;
  const mockPrintDuplicates = printDuplicates as ReturnType<typeof vi.fn>;
  const mockPrintHeader = printHeader as ReturnType<typeof vi.fn>;
  const mockPrintAutoFix = printAutoFix as ReturnType<typeof vi.fn>;
  const mockPrintIssues = printIssues as ReturnType<typeof vi.fn>;
  const mockPrintSuccess = printSuccess as ReturnType<typeof vi.fn>;
  const mockPrintGitignoreWarning = printGitignoreWarning as ReturnType<
    typeof vi.fn
  >;
  const mockCompareJsonOutput = compareJsonOutput as ReturnType<typeof vi.fn>;
  const mockPrintErrorNotFound = printErrorNotFound as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-compare-'));
    envPath = path.join(cwd, '.env');
    examplePath = path.join(cwd, '.env.example');

    // Create files
    fs.writeFileSync(envPath, 'KEY1=value1\nKEY2=value2\n');
    fs.writeFileSync(examplePath, 'KEY1=\nKEY2=\n');

    // Setup default mock implementations
    mockParseEnvFile.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return { KEY1: 'value1', KEY2: 'value2' };
      }
      return { KEY1: '', KEY2: '' };
    });

    mockDiffEnv.mockReturnValue({
      missing: [],
      extra: [],
      valueMismatches: [],
    });

    mockFindDuplicateKeys.mockReturnValue([]);
    mockCheckGitignoreStatus.mockReturnValue(null);
    mockFilterIgnoredKeys.mockImplementation((keys) => keys);
    mockUpdateTotals.mockReturnValue(false);
    mockCompareJsonOutput.mockImplementation((params) => params);
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  const createOptions = (
    overrides: Partial<ComparisonOptions> = {},
  ): ComparisonOptions => ({
    checkValues: false,
    cwd,
    allowDuplicates: false,
    fix: false,
    json: false,
    ignore: [],
    ignoreRegex: [],
    showStats: false,
    strict: false,
    ...overrides,
  });

  it('compares successfully when files exist and have no issues', async () => {
    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    const result = await compareMany(pairs, opts);

    expect(result.exitWithError).toBe(false);
    expect(mockPrintHeader).toHaveBeenCalledWith('.env', '.env.example', false);
    expect(mockPrintSuccess).toHaveBeenCalledWith(false, 'compare');
  });

  it('returns exitWithError true when both files do not exist', async () => {
    const nonExistentEnv = path.join(cwd, 'missing.env');
    const nonExistentExample = path.join(cwd, 'missing.example');

    const pairs: FilePair[] = [
      {
        envName: 'missing.env',
        envPath: nonExistentEnv,
        examplePath: nonExistentExample,
      },
    ];
    const opts = createOptions();

    const result = await compareMany(pairs, opts);

    expect(result.exitWithError).toBe(true);
    expect(mockPrintErrorNotFound).toHaveBeenCalled();
  });

  it('detects missing keys and reports them', async () => {
    mockDiffEnv.mockReturnValue({
      missing: ['KEY3'],
      extra: [],
      valueMismatches: [],
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockPrintIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        missing: ['KEY3'],
      }),
      false,
      false,
    );
  });

  it('detects extra keys and reports them', async () => {
    mockDiffEnv.mockReturnValue({
      missing: [],
      extra: ['EXTRA_KEY'],
      valueMismatches: [],
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockPrintIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: ['EXTRA_KEY'],
      }),
      false,
      false,
    );
  });

  it('detects empty keys and reports them', async () => {
    mockParseEnvFile.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return { KEY1: '', KEY2: 'value2' };
      }
      return { KEY1: '', KEY2: '' };
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockPrintIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        empty: ['KEY1'],
      }),
      false,
      false,
    );
  });

  it('detects duplicates in env and example files', async () => {
    mockFindDuplicateKeys.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return [{ key: 'DUP_KEY', count: 2 }];
      }
      if (filePath === examplePath) {
        return [{ key: 'DUP_EX', count: 3 }];
      }
      return [];
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockPrintDuplicates).toHaveBeenCalledWith(
      '.env',
      '.env.example',
      [{ key: 'DUP_KEY', count: 2 }],
      [{ key: 'DUP_EX', count: 3 }],
      false,
      false,
    );
  });

  it('skips duplicates check when allowDuplicates is true', async () => {
    mockFindDuplicateKeys.mockReturnValue([{ key: 'DUP', count: 2 }]);

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ allowDuplicates: true });

    await compareMany(pairs, opts);

    expect(mockPrintDuplicates).toHaveBeenCalledWith(
      '.env',
      '.env.example',
      [],
      [],
      false,
      false,
    );
  });

  it('checks gitignore status and reports issues', async () => {
    mockCheckGitignoreStatus.mockReturnValue({
      reason: 'not-ignored',
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockPrintGitignoreWarning).toHaveBeenCalledWith({
      envFile: '.env',
      reason: 'not-ignored',
    });
  });

  it('checks values when checkValues is true', async () => {
    mockDiffEnv.mockReturnValue({
      missing: [],
      extra: [],
      valueMismatches: [
        { key: 'KEY1', expected: 'expected', actual: 'actual' },
      ],
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ checkValues: true });

    await compareMany(pairs, opts);

    expect(mockDiffEnv).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      true,
    );
    expect(mockPrintIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        mismatches: [{ key: 'KEY1', expected: 'expected', actual: 'actual' }],
      }),
      false,
      false,
    );
  });

  it('applies fixes when fix flag is enabled', async () => {
    mockDiffEnv.mockReturnValue({
      missing: ['MISSING_KEY'],
      extra: [],
      valueMismatches: [],
    });

    mockApplyFixes.mockReturnValue({
      changed: true,
      result: {
        removedDuplicates: [],
        addedEnv: ['MISSING_KEY'],
        gitignoreUpdated: false,
      },
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ fix: true });

    await compareMany(pairs, opts);

    expect(mockApplyFixes).toHaveBeenCalledWith({
      envPath,
      missingKeys: ['MISSING_KEY'],
      duplicateKeys: [],
      ensureGitignore: false,
    });

    expect(mockPrintAutoFix).toHaveBeenCalledWith(
      {
        fixApplied: true,
        removedDuplicates: [],
        addedEnv: ['MISSING_KEY'],
        gitignoreUpdated: false,
      },
      '.env',
      false,
    );
  });

  it('applies fixes with duplicate keys when duplicates exist', async () => {
    mockDiffEnv.mockReturnValue({
      missing: [],
      extra: [],
      valueMismatches: [],
    });

    mockFindDuplicateKeys.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return [
          { key: 'DUPLICATE_KEY', count: 2 },
          { key: 'ANOTHER_DUP', count: 3 },
        ];
      }
      return [];
    });

    mockApplyFixes.mockReturnValue({
      changed: true,
      result: {
        removedDuplicates: ['DUPLICATE_KEY', 'ANOTHER_DUP'],
        addedEnv: [],
        gitignoreUpdated: false,
      },
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ fix: true });

    await compareMany(pairs, opts);

    expect(mockApplyFixes).toHaveBeenCalledWith({
      envPath,
      missingKeys: [],
      duplicateKeys: ['DUPLICATE_KEY', 'ANOTHER_DUP'],
      ensureGitignore: false,
    });
  });

  it('shows stats when showStats is enabled', async () => {
    mockParseEnvFile.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return { KEY1: 'value1', KEY2: 'value2', KEY3: 'value3' };
      }
      return { KEY1: '', KEY2: '' };
    });

    mockFilterIgnoredKeys.mockImplementation((keys) => keys);

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ showStats: true });

    await compareMany(pairs, opts);

    expect(mockPrintStats).toHaveBeenCalledWith(
      '.env',
      '.env.example',
      expect.objectContaining({
        envCount: 3,
        exampleCount: 2,
        sharedCount: 2,
      }),
      expect.any(Object),
      false,
      true,
      false,
    );
  });

  it('calculates duplicateCount correctly in stats (count - 1)', async () => {
    mockFindDuplicateKeys.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return [{ key: 'DUP_ENV', count: 3 }]; // contributes 2
      }
      if (filePath === examplePath) {
        return [{ key: 'DUP_EX', count: 2 }]; // contributes 1
      }
      return [];
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ showStats: true });

    await compareMany(pairs, opts);

    expect(mockPrintStats).toHaveBeenCalledWith(
      '.env',
      '.env.example',
      expect.objectContaining({
        duplicateCount: 3, // (3-1) + (2-1) = 2 + 1
      }),
      expect.any(Object),
      false,
      true,
      false,
    );
  });

  it('returns exitWithError true in strict mode when issues exist', async () => {
    mockDiffEnv.mockReturnValue({
      missing: ['MISSING_KEY'],
      extra: [],
      valueMismatches: [],
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ strict: true });

    const result = await compareMany(pairs, opts);

    expect(result.exitWithError).toBe(true);
  });

  it('returns exitWithError false in strict mode when no issues exist', async () => {
    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ strict: true });

    const result = await compareMany(pairs, opts);

    expect(result.exitWithError).toBe(false);
  });

  it('filters categories based on --only flag', async () => {
    mockDiffEnv.mockReturnValue({
      missing: ['MISSING'],
      extra: ['EXTRA'],
      valueMismatches: [],
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ only: ['missing'] });

    await compareMany(pairs, opts);

    expect(mockPrintIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        missing: ['MISSING'],
        extra: [],
      }),
      false,
      false,
    );
  });

  it('skips gitignore check when not in only filter', async () => {
    mockCheckGitignoreStatus.mockReturnValue({
      reason: 'not-ignored',
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ only: ['missing'] });

    await compareMany(pairs, opts);

    expect(mockPrintGitignoreWarning).not.toHaveBeenCalled();
  });

  it('collects entries when collect callback is provided', async () => {
    const collected: CompareJsonEntry[] = [];
    const collect = (entry: CompareJsonEntry) => {
      collected.push(entry);
    };

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ collect });

    await compareMany(pairs, opts);

    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({
      envName: '.env',
      exampleName: '.env.example',
    });
  });

  it('processes multiple pairs sequentially', async () => {
    const env2Path = path.join(cwd, '.env.production');
    fs.writeFileSync(env2Path, 'PROD_KEY=prod\n');

    const pairs: FilePair[] = [
      { envName: '.env', envPath, examplePath },
      { envName: '.env.production', envPath: env2Path, examplePath },
    ];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockPrintHeader).toHaveBeenCalledTimes(2);
    expect(mockPrintHeader).toHaveBeenNthCalledWith(
      1,
      '.env',
      '.env.example',
      false,
    );
    expect(mockPrintHeader).toHaveBeenNthCalledWith(
      2,
      '.env.production',
      '.env.example',
      false,
    );
  });

  it('returns exitWithError true when updateTotals indicates error', async () => {
    mockUpdateTotals.mockReturnValue(true);

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    const result = await compareMany(pairs, opts);

    expect(result.exitWithError).toBe(true);
  });

  it('filters ignored keys correctly', async () => {
    mockParseEnvFile.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return { KEY1: 'value1', IGNORED: 'ignored', KEY2: 'value2' };
      }
      return { KEY1: '', KEY2: '' };
    });

    mockFilterIgnoredKeys.mockImplementation((keys, ignore) => {
      return keys.filter((k: string) => !ignore.includes(k));
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ ignore: ['IGNORED'] });

    await compareMany(pairs, opts);

    expect(mockFilterIgnoredKeys).toHaveBeenCalledWith(
      expect.arrayContaining(['KEY1', 'IGNORED', 'KEY2']),
      ['IGNORED'],
      [],
    );
  });

  it('filters keys with regex patterns', async () => {
    mockFilterIgnoredKeys.mockImplementation((keys, _ignore, regexList) => {
      return keys.filter(
        (k: string) => !regexList.some((rx: RegExp) => rx.test(k)),
      );
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ ignoreRegex: [/^TEST_/] });

    await compareMany(pairs, opts);

    expect(mockFilterIgnoredKeys).toHaveBeenCalledWith(
      expect.any(Array),
      [],
      [/^TEST_/],
    );
  });

  it('does not print success when issues exist', async () => {
    mockDiffEnv.mockReturnValue({
      missing: ['MISSING'],
      extra: [],
      valueMismatches: [],
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockPrintSuccess).not.toHaveBeenCalled();
  });

  it('prints fix tips when issues exist and fix is not enabled', async () => {
    mockDiffEnv.mockReturnValue({
      missing: ['MISSING'],
      extra: [],
      valueMismatches: [],
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ fix: false });

    await compareMany(pairs, opts);

    expect(mockPrintFixTips).toHaveBeenCalledWith(
      expect.objectContaining({
        missing: ['MISSING'],
      }),
      false,
      false,
      false,
    );
  });

  it('outputs JSON format when json flag is enabled', async () => {
    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ json: true });

    await compareMany(pairs, opts);

    expect(mockPrintHeader).toHaveBeenCalledWith('.env', '.env.example', true);
    expect(mockPrintStats).not.toHaveBeenCalled(); // No stats in JSON mode
  });

  it('handles empty values correctly', async () => {
    mockParseEnvFile.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return { KEY1: '', KEY2: '  ', KEY3: 'value' };
      }
      return { KEY1: '', KEY2: '', KEY3: '' };
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockPrintIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        empty: expect.arrayContaining(['KEY1', 'KEY2']),
      }),
      false,
      false,
    );
  });

  it('includes stats in JSON output', async () => {
    mockParseEnvFile.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return { KEY1: 'value1', KEY2: 'value2', KEY3: 'value3' };
      }
      return { KEY1: '', KEY2: '' };
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    await compareMany(pairs, opts);

    expect(mockCompareJsonOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        stats: expect.objectContaining({
          envCount: 3,
          exampleCount: 2,
          sharedCount: 2,
          duplicateCount: 0,
          valueMismatchCount: 0,
        }),
      }),
    );
  });

  it('handles missing example file gracefully', async () => {
    fs.unlinkSync(examplePath);

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    const result = await compareMany(pairs, opts);

    expect(result.exitWithError).toBe(true);
    expect(mockPrintErrorNotFound).toHaveBeenCalled();
  });

  it('handles missing env file gracefully', async () => {
    fs.unlinkSync(envPath);

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions();

    const result = await compareMany(pairs, opts);

    expect(result.exitWithError).toBe(true);
    expect(mockPrintErrorNotFound).toHaveBeenCalled();
  });

  it('filters duplicate keys by ignore list', async () => {
    mockFindDuplicateKeys.mockReturnValue([
      { key: 'DUP1', count: 2 },
      { key: 'IGNORED_DUP', count: 2 },
    ]);

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ ignore: ['IGNORED_DUP'] });

    await compareMany(pairs, opts);

    // The filtering happens inside findDuplicates helper
    expect(mockFindDuplicateKeys).toHaveBeenCalled();
  });

  it('applies gitignore fix when ensureGitignore is true', async () => {
    mockCheckGitignoreStatus.mockReturnValue({
      reason: 'not-ignored',
    });

    mockApplyFixes.mockReturnValue({
      changed: true,
      result: {
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: true,
      },
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ fix: true });

    await compareMany(pairs, opts);

    expect(mockApplyFixes).toHaveBeenCalledWith(
      expect.objectContaining({
        ensureGitignore: true,
      }),
    );
  });

  it('handles multiple issues simultaneously', async () => {
    mockDiffEnv.mockReturnValue({
      missing: ['MISSING1', 'MISSING2'],
      extra: ['EXTRA1'],
      valueMismatches: [{ key: 'KEY1', expected: 'exp', actual: 'act' }],
    });

    mockFindDuplicateKeys.mockReturnValue([{ key: 'DUP', count: 2 }]);

    mockCheckGitignoreStatus.mockReturnValue({
      reason: 'no-gitignore',
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ checkValues: true, strict: true });

    const result = await compareMany(pairs, opts);

    expect(result.exitWithError).toBe(true);
    expect(mockPrintIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        missing: ['MISSING1', 'MISSING2'],
        extra: ['EXTRA1'],
        mismatches: [{ key: 'KEY1', expected: 'exp', actual: 'act' }],
      }),
      false,
      false,
    );
    expect(mockPrintGitignoreWarning).toHaveBeenCalled();
  });

  it('correctly calculates shared keys count', async () => {
    mockParseEnvFile.mockImplementation((filePath: string) => {
      if (filePath === envPath) {
        return { KEY1: 'v1', KEY2: 'v2', KEY3: 'v3' };
      }
      return { KEY1: '', KEY2: '', KEY4: '' };
    });

    const pairs: FilePair[] = [{ envName: '.env', envPath, examplePath }];
    const opts = createOptions({ showStats: true });

    await compareMany(pairs, opts);

    expect(mockPrintStats).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        envCount: 3,
        exampleCount: 3,
        sharedCount: 2, // KEY1 and KEY2
      }),
      expect.any(Object),
      false,
      true,
      false,
    );
  });
});
