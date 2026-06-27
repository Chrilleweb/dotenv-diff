import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Command } from 'commander';
import type {
  Options,
  RawOptions,
  CompareJsonEntry,
} from '../../../src/config/types.js';
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

vi.mock('../../../src/commands/explain.js', () => ({
  explainKey: vi.fn(),
}));

vi.mock('../../../src/commands/matrix.js', () => ({
  runMatrix: vi.fn(),
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
import { explainKey } from '../../../src/commands/explain.js';
import { runMatrix } from '../../../src/commands/matrix.js';
import { DEFAULT_ENV_FILE } from '../../../src/config/constants.js';

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
    listAll: false,
    explain: undefined,
    baseline: false,
    matrix: false,
    matrixFiles: [],
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
  const mockRunMatrix = runMatrix as ReturnType<typeof vi.fn>;
  const mockRunInit = runInit as ReturnType<typeof vi.fn>;
  const mockExplainKey = explainKey as ReturnType<typeof vi.fn>;

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

  it('covers direct comparison guard when flags become missing at runtime', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: true })),
    } as unknown as Command;

    const dynamicOptions = createBaseOptions({ compare: true });
    let envReads = 0;
    Object.defineProperty(dynamicOptions, 'envFlag', {
      configurable: true,
      get: () => {
        envReads += 1;
        return envReads === 1 ? 'a.env' : undefined;
      },
    });
    Object.defineProperty(dynamicOptions, 'exampleFlag', {
      configurable: true,
      get: () => 'b.env',
    });

    mockNormalizeOptions.mockReturnValue(dynamicOptions);

    await run(program);

    expect(mockCompareMany).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('continues interactive missing-file flow when prompt does not request exit', async () => {
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

    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    mockPromptEnsureFiles.mockResolvedValue({
      shouldExit: false,
      exitCode: 0,
    });
    mockCompareMany.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockPromptEnsureFiles).toHaveBeenCalled();
    expect(mockCompareMany).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(0);
    existsSpy.mockRestore();
  });

  it('passes envFlag string directly to scanUsage envPath', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: false })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({ compare: false, envFlag: 'custom.env' }),
    );
    mockScanUsage.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockScanUsage).toHaveBeenCalledWith(
      expect.objectContaining({ envPath: 'custom.env' }),
    );
  });

  it('uses undefined envPath when no env flag and default env file is missing', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: false })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(createBaseOptions({ compare: false }));
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    mockScanUsage.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockScanUsage).toHaveBeenCalledWith(
      expect.objectContaining({ envPath: undefined }),
    );
    existsSpy.mockRestore();
  });

  it('uses DEFAULT_ENV_FILE envPath when no env flag and default env file exists', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: false })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(createBaseOptions({ compare: false }));
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    mockScanUsage.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockScanUsage).toHaveBeenCalledWith(
      expect.objectContaining({ envPath: DEFAULT_ENV_FILE }),
    );
    existsSpy.mockRestore();
  });

  it('prints JSON report output and uses collect callback in compare mode', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: true })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({
        compare: true,
        json: true,
        envFlag: 'a.env',
        exampleFlag: 'b.env',
      }),
    );

    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockCompareMany.mockImplementation(async (_pairs, options) => {
      options.collect?.({ ok: true } as CompareJsonEntry);
      return { exitWithError: false };
    });

    await run(program);

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ ok: true }], null, 2),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);

    logSpy.mockRestore();
    existsSpy.mockRestore();
  });

  it('does not include only in compare options when opts.only is undefined', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ compare: true })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({
        compare: true,
        envFlag: 'a.env',
        exampleFlag: 'b.env',
        only: undefined,
      } as unknown as Partial<Options>),
    );

    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    mockCompareMany.mockResolvedValue({ exitWithError: false });

    await run(program);

    const compareOptions = mockCompareMany.mock.calls[0]?.[1];
    expect(compareOptions).toBeDefined();
    expect('only' in compareOptions).toBe(false);

    existsSpy.mockRestore();
  });

  it('routes to explainKey when opts.explain is set and exits with 0', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ explain: 'MY_KEY' })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({ explain: 'MY_KEY' }),
    );
    mockExplainKey.mockResolvedValue(undefined);
    // process.exit is mocked (doesn't really exit), so scanUsage is reached too
    mockScanUsage.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockExplainKey).toHaveBeenCalledOnce();
    expect(mockExplainKey).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'MY_KEY' }),
    );
    // First exit(0) is from the explain path
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('passes json flag to explainKey', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ explain: 'DB_URL' })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({ explain: 'DB_URL', json: true }),
    );
    mockExplainKey.mockResolvedValue(undefined);
    mockScanUsage.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockExplainKey).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'DB_URL', json: true }),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('routes to runMatrix when opts.matrix is set and exits with 0 on success', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ matrix: true })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({ matrix: true, matrixFiles: [] }),
    );
    mockRunMatrix.mockResolvedValue({ exitWithError: false });

    await run(program);

    expect(mockRunMatrix).toHaveBeenCalledOnce();
    expect(mockRunMatrix).toHaveBeenCalledWith(
      expect.objectContaining({ files: [] }),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('routes to runMatrix with explicit files and exits with 1 on differences', async () => {
    const program = {
      parse: vi.fn(),
      opts: vi.fn(() => ({ matrix: ['.env.production', '.env.staging'] })),
    } as unknown as Command;

    mockNormalizeOptions.mockReturnValue(
      createBaseOptions({
        matrix: true,
        matrixFiles: ['.env.production', '.env.staging'],
      }),
    );
    mockRunMatrix.mockResolvedValue({ exitWithError: true });

    await run(program);

    expect(mockRunMatrix).toHaveBeenCalledWith(
      expect.objectContaining({
        files: ['.env.production', '.env.staging'],
      }),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
