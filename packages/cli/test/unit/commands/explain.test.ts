import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { explainKey } from '../../../src/commands/explain.js';
import type { ExplainOptions } from '../../../src/commands/explain.js';

// ---- mocks ----
vi.mock('../../../src/services/scanCodebase.js', () => ({
  scanCodebase: vi.fn(),
}));

vi.mock('../../../src/services/parseEnvFile.js', () => ({
  parseEnvFile: vi.fn(),
}));

vi.mock('../../../src/core/duplicates.js', () => ({
  findDuplicateKeys: vi.fn(),
}));

vi.mock('../../../src/core/helpers/skipCommentedUsages.js', () => ({
  skipCommentedUsages: vi.fn((usages) => usages),
}));

vi.mock('../../../src/ui/scan/printExplain.js', () => ({
  printExplain: vi.fn(),
}));

import { scanCodebase } from '../../../src/services/scanCodebase.js';
import { parseEnvFile } from '../../../src/services/parseEnvFile.js';
import { findDuplicateKeys } from '../../../src/core/duplicates.js';
import { skipCommentedUsages } from '../../../src/core/helpers/skipCommentedUsages.js';
import { printExplain } from '../../../src/ui/scan/printExplain.js';

const mockScanCodebase = scanCodebase as ReturnType<typeof vi.fn>;
const mockParseEnvFile = parseEnvFile as ReturnType<typeof vi.fn>;
const mockFindDuplicateKeys = findDuplicateKeys as ReturnType<typeof vi.fn>;
const mockSkipCommentedUsages = skipCommentedUsages as ReturnType<typeof vi.fn>;
const mockPrintExplain = printExplain as ReturnType<typeof vi.fn>;

function baseOpts(overrides: Partial<ExplainOptions> = {}): ExplainOptions {
  return {
    key: 'API_KEY',
    cwd: '/project',
    include: [],
    exclude: [],
    ignore: [],
    ignoreRegex: [],
    files: [],
    secrets: false,
    json: false,
    ...overrides,
  };
}

describe('explainKey', () => {
  let readdirSyncSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // By default no env files on disk
    readdirSyncSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue([] as never);

    mockParseEnvFile.mockReturnValue({});
    mockFindDuplicateKeys.mockReturnValue([]);
    mockSkipCommentedUsages.mockImplementation((u) => u);
    mockScanCodebase.mockResolvedValue({ used: [] });

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    readdirSyncSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('calls printExplain when json is false', async () => {
    await explainKey(baseOpts());

    expect(mockPrintExplain).toHaveBeenCalledOnce();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('outputs JSON and does not call printExplain when json is true', async () => {
    await explainKey(baseOpts({ json: true }));

    expect(mockPrintExplain).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledOnce();

    const jsonArg = logSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(jsonArg as string);
    expect(parsed).toMatchObject({
      key: 'API_KEY',
      definedIn: [],
      usages: [],
      isDuplicated: false,
      isIgnored: false,
    });
  });

  it('marks key as defined when env file contains it', async () => {
    readdirSyncSpy.mockReturnValue(['.env'] as never);
    mockParseEnvFile.mockReturnValue({ API_KEY: 'secret' });
    mockFindDuplicateKeys.mockReturnValue([]);

    await explainKey(baseOpts({ json: true }));

    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.definedIn).toEqual(['.env']);
  });

  it('does not add file to definedIn when env file exists but key is absent', async () => {
    readdirSyncSpy.mockReturnValue(['.env'] as never);
    mockParseEnvFile.mockReturnValue({ OTHER_KEY: 'value' }); // API_KEY not present

    await explainKey(baseOpts({ json: true }));

    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.definedIn).toEqual([]);
  });

  it('marks key as duplicated when findDuplicateKeys returns the key', async () => {
    readdirSyncSpy.mockReturnValue(['.env'] as never);
    mockParseEnvFile.mockReturnValue({ API_KEY: 'secret' });
    mockFindDuplicateKeys.mockReturnValue([{ key: 'API_KEY', count: 2 }]);

    await explainKey(baseOpts({ json: true }));

    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.isDuplicated).toBe(true);
  });

  it('marks key as ignored when key is in ignore list', async () => {
    await explainKey(baseOpts({ ignore: ['API_KEY'], json: true }));

    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.isIgnored).toBe(true);
  });

  it('marks key as ignored when key matches ignoreRegex', async () => {
    await explainKey(baseOpts({ ignoreRegex: [/^API_/], json: true }));

    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.isIgnored).toBe(true);
  });

  it('includes only usages matching the key', async () => {
    const usage = {
      variable: 'API_KEY',
      file: 'src/app.ts',
      line: 5,
      column: 10,
      pattern: 'process.env' as const,
      context: 'process.env.API_KEY',
    };
    const otherUsage = {
      variable: 'OTHER_KEY',
      file: 'src/app.ts',
      line: 6,
      column: 10,
      pattern: 'process.env' as const,
      context: 'process.env.OTHER_KEY',
    };
    mockScanCodebase.mockResolvedValue({ used: [usage, otherUsage] });

    await explainKey(baseOpts({ json: true }));

    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.usages).toHaveLength(1);
    expect(parsed.usages[0].variable).toBe('API_KEY');
  });

  it('returns early with empty definedIn when readdirSync throws', async () => {
    readdirSyncSpy.mockImplementation(() => {
      throw new Error('EACCES');
    });

    await explainKey(baseOpts({ json: true }));

    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.definedIn).toEqual([]);
  });

  it('discovers .env and .env.example files but not unrelated files', async () => {
    readdirSyncSpy.mockReturnValue([
      '.env',
      '.env.local',
      '.env.example',
      'package.json',
      'src',
    ] as never);
    mockParseEnvFile.mockReturnValue({ API_KEY: 'x' });

    await explainKey(baseOpts({ key: 'API_KEY', json: true }));

    // parseEnvFile should be called for .env, .env.local, .env.example — but NOT package.json or src
    expect(mockParseEnvFile).toHaveBeenCalledTimes(3);
  });

  it('passes correct relative path relative to cwd for definedIn', async () => {
    readdirSyncSpy.mockReturnValue(['.env'] as never);
    mockParseEnvFile.mockReturnValue({ API_KEY: 'x' });

    const cwd = '/my/project';
    await explainKey(baseOpts({ cwd, json: true }));

    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.definedIn).toEqual(['.env']);
  });

  it('passes opts to printExplain with correct shape in non-json mode', async () => {
    readdirSyncSpy.mockReturnValue(['.env'] as never);
    mockParseEnvFile.mockReturnValue({ API_KEY: 'val' });

    await explainKey(baseOpts());

    expect(mockPrintExplain).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'API_KEY',
        isDuplicated: false,
        isIgnored: false,
      }),
    );
  });
});
