import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Command } from 'commander';
import type { Options, RawOptions } from '../../../src/config/types.js';
import fs from 'fs';

vi.mock('../../../src/config/options.js', () => ({
  normalizeOptions: vi.fn(),
}));

vi.mock('../../../src/services/envDiscovery.js', () => ({
  discoverEnvFiles: vi.fn(),
}));

vi.mock('../../../src/services/envPairing.js', () => ({
  envPairing: vi.fn(),
}));

vi.mock('../../../src/commands/prompts/promptEnsureFiles.js', () => ({
  promptEnsureFiles: vi.fn(),
}));

vi.mock('../../../src/commands/compare.js', () => ({
  compareMany: vi.fn(),
}));

vi.mock('../../../src/commands/scanUsage.js', () => ({
  scanUsage: vi.fn(),
}));

vi.mock('../../../src/ui/compare/printErrorNotFound.js', () => ({
  printErrorNotFound: vi.fn(),
}));

vi.mock('../../../src/ui/shared/setupGlobalConfig.js', () => ({
  setupGlobalConfig: vi.fn(),
}));

vi.mock('../../../src/config/loadConfig.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../src/commands/init.js', () => ({
  runInit: vi.fn(),
}));

import { run } from '../../../src/cli/run.js';
import { normalizeOptions } from '../../../src/config/options.js';
import { discoverEnvFiles } from '../../../src/services/envDiscovery.js';
import { envPairing } from '../../../src/services/envPairing.js';
import { promptEnsureFiles } from '../../../src/commands/prompts/promptEnsureFiles.js';
import { compareMany } from '../../../src/commands/compare.js';
import { scanUsage } from '../../../src/commands/scanUsage.js';
import { setupGlobalConfig } from '../../../src/ui/shared/setupGlobalConfig.js';
import { loadConfig } from '../../../src/config/loadConfig.js';
import { runInit } from '../../../src/commands/init.js';

function createBaseOptions(overrides: Partial<Options> = {}): Options {
  return {
    checkValues: false,
    isCiMode: false,
    isYesMode: false,
    allowDuplicates: false,
    fix: false,
    json: false,
    envFlag: undefined,
    exampleFlag: undefined,
    ignore: [],
    ignoreRegex: [],
    cwd: process.cwd(),
    only: [],
    compare: false,
    scanUsage: false,
    includeFiles: [],
    excludeFiles: [],
    showUnused: true,
    showStats: false,
    files: [],
    noColor: false,
    secrets: true,
    strict: false,
    ignoreUrls: [],
    uppercaseKeys: true,
    expireWarnings: true,
    inconsistentNamingWarnings: true,
    ...overrides,
  };
}

describe('run', () => {
  const mockNormalizeOptions = normalizeOptions as ReturnType<typeof vi.fn>;
  const mockDiscoverEnvFiles = discoverEnvFiles as ReturnType<typeof vi.fn>;
  const mockEnvPairing = envPairing as ReturnType<typeof vi.fn>;
  const mockPromptEnsureFiles = promptEnsureFiles as ReturnType<typeof vi.fn>;
  const mockCompareMany = compareMany as ReturnType<typeof vi.fn>;
  const mockScanUsage = scanUsage as ReturnType<typeof vi.fn>;
  const mockSetupGlobalConfig = setupGlobalConfig as ReturnType<typeof vi.fn>;
  const mockLoadConfig = loadConfig as ReturnType<typeof vi.fn>;
  const mockRunInit = runInit as ReturnType<typeof vi.fn>;

  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(
        (() => undefined) as (
          code?: string | number | null | undefined,
        ) => never,
      );

    mockLoadConfig.mockImplementation((opts: RawOptions) => opts);
  });

  afterEach(() => {
    vi.clearAllMocks();
    exitSpy.mockRestore();
  });

  it('handles --init and exits early without process.exit', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ init: true })),
    } as unknown as Command;

    await run(program);

    expect(mockRunInit).toHaveBeenCalledOnce();
    expect(mockSetupGlobalConfig).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('runs scan mode and exits with code 0 when no error', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: false })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(createBaseOptions({ compare: false }));
    mockScanUsage.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockScanUsage).toHaveBeenCalledOnce();
    expect(mockSetupGlobalConfig).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('runs compare auto-discovery mode and exits with code 1 on error', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: true })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(createBaseOptions({ compare: true }));
    mockDiscoverEnvFiles.mockReturnValue({
      cwd: process.cwd(),
      envFiles: ['.env'],
      primaryEnv: '.env',
      primaryExample: '.env.example',
      envFlag: null,
      exampleFlag: null,
      alreadyWarnedMissingEnv: false,
    });
    mockPromptEnsureFiles.mockResolvedValue({
      didCreate: true,
      shouldExit: false,
      exitCode: 0,
    });
    mockEnvPairing.mockReturnValue([
      {
        envName: '.env',
        envPath: '.env',
        examplePath: '.env.example',
      },
    ]);
    mockCompareMany.mockResolvedValue({ exitWithError: true });

    await run(program);

    expect(mockDiscoverEnvFiles).toHaveBeenCalledOnce();
    expect(mockPromptEnsureFiles).toHaveBeenCalledOnce();
    expect(mockCompareMany).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('runs direct file comparison when both flags provided', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: true })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({
        compare: true,
        envFlag: 'a.env',
        exampleFlag: 'b.env',
      }),
    );

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    mockCompareMany.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockCompareMany).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('handles missing files in CI mode', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: true })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({
        compare: true,
        envFlag: 'a.env',
        exampleFlag: 'b.env',
        isCiMode: true,
      }),
    );

    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    await run(program);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('handles missing files in interactive mode with shouldExit true', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: true })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({
        compare: true,
        envFlag: 'a.env',
        exampleFlag: 'b.env',
        isCiMode: false,
      }),
    );

    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    mockPromptEnsureFiles.mockResolvedValue({
      shouldExit: true,
      exitCode: 1,
    });

    await run(program);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('auto-discovery exits early when initResult.shouldExit is true', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: true })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(createBaseOptions({ compare: true }));

    mockDiscoverEnvFiles.mockReturnValue({
      cwd: process.cwd(),
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
    });

    mockPromptEnsureFiles.mockResolvedValue({
      shouldExit: true,
      exitCode: 1,
    });

    await run(program);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
