import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ScanUsageOptions,
  ScanResult,
} from '../../../src/config/types.js';
import { type SecretFinding } from '../../../src/core/security/secretDetectors.js';
import { promptNoEnvScenario } from '../../../src/commands/prompts/promptNoEnvScenario.js';

vi.mock('../../../src/services/scanCodebase.js', () => ({
  scanCodebase: vi.fn(),
}));

vi.mock('../../../src/core/scan/determineComparisonFile.js', () => ({
  determineComparisonFile: vi.fn(),
}));

vi.mock('../../../src/services/printScanResult.js', () => ({
  printScanResult: vi.fn(),
}));

vi.mock('../../../src/ui/scan/scanJsonOutput.js', () => ({
  scanJsonOutput: vi.fn(() => ({ ok: true })),
}));

vi.mock('../../../src/ui/scan/printMissingExample.js', () => ({
  printMissingExample: vi.fn(() => false),
}));

vi.mock('../../../src/services/processComparisonFile.js', () => ({
  processComparisonFile: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printComparisonError.js', () => ({
  printComparisonError: vi.fn(() => ({ exit: false })),
}));

vi.mock('../../../src/core/security/secretDetectors.js', () => ({
  hasIgnoreComment: vi.fn(() => false),
}));

vi.mock('../../../src/core/frameworks/frameworkValidator.js', () => ({
  frameworkValidator: vi.fn(() => []),
}));

vi.mock('../../../src/core/security/exampleSecretDetector.js', () => ({
  detectSecretsInExample: vi.fn(() => [
    {
      key: 'SECRET',
      value: '123',
      reason: 'hardcoded',
      severity: 'high',
    },
  ]),
}));

vi.mock('../../../src/commands/prompts/promptNoEnvScenario.js', () => ({
  promptNoEnvScenario: vi.fn(),
}));

import { scanUsage } from '../../../src/commands/scanUsage.js';
import { scanCodebase } from '../../../src/services/scanCodebase.js';
import { determineComparisonFile } from '../../../src/core/scan/determineComparisonFile.js';
import { printScanResult } from '../../../src/services/printScanResult.js';
import { processComparisonFile } from '../../../src/services/processComparisonFile.js';
import { printMissingExample } from '../../../src/ui/scan/printMissingExample.js';
import { printComparisonError } from '../../../src/ui/scan/printComparisonError.js';

describe('scanUsage', () => {
  const dummySecret: SecretFinding = {
    file: 'file.ts',
    line: 1,
    kind: 'pattern',
    message: 'secret found',
    snippet: 'SECRET=123',
    severity: 'high',
  };

  const baseScanResult: ScanResult = {
    used: [],
    missing: [],
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
    fileContentMap: new Map(),
  };

  const baseOpts: ScanUsageOptions = {
    cwd: '/root',
    include: [],
    exclude: [],
    ignore: [],
    ignoreRegex: [],
    secrets: false,
    json: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scanCodebase).mockResolvedValue({ ...baseScanResult });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });
    vi.mocked(printScanResult).mockReturnValue({ exitWithError: false });
    vi.mocked(printMissingExample).mockReturnValue(false);
    vi.mocked(promptNoEnvScenario).mockResolvedValue({ compareFile: undefined });
  });

  it('returns early when example missing in CI mode', async () => {
    vi.mocked(printMissingExample).mockReturnValue(true);

    const result = await scanUsage(baseOpts);

    expect(result.exitWithError).toBe(true);
  });

  it('exits when comparison error requests exit', async () => {
    vi.mocked(determineComparisonFile).mockResolvedValue({
      type: 'found',
      file: { path: '/env/.env', name: '.env' },
    });

    vi.mocked(processComparisonFile).mockReturnValue({
      error: { message: 'err', shouldExit: true },
    } as any);

    vi.mocked(printComparisonError).mockReturnValue({ exit: true });

    const result = await scanUsage(baseOpts);

    expect(result.exitWithError).toBe(true);
  });

  it('returns error in JSON mode when missing keys exist', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      missing: ['A'],
    });

    const result = await scanUsage({ ...baseOpts, json: true });

    expect(result.exitWithError).toBe(true);
  });

  it('returns error in JSON mode for high severity secret', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      secrets: [dummySecret],
    });

    const result = await scanUsage({ ...baseOpts, json: true });

    expect(result.exitWithError).toBe(true);
  });

  it('returns strict error in JSON mode when strict violations exist', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      unused: ['A'],
    });

    const result = await scanUsage({
      ...baseOpts,
      json: true,
      strict: true,
    });

    expect(result.exitWithError).toBe(true);
  });

it('skips prompt when type is none and isCiMode is true', async () => {
  vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

  const result = await scanUsage({ ...baseOpts, isCiMode: true });

  expect(promptNoEnvScenario).not.toHaveBeenCalled();
  expect(result.exitWithError).toBe(false);
});

it('skips prompt when type is none and json is true', async () => {
  vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

  const result = await scanUsage({ ...baseOpts, json: true });

  expect(promptNoEnvScenario).not.toHaveBeenCalled();
  expect(result.exitWithError).toBe(false);
});

  it('calls promptNoEnvScenario when type is none and not CI/json', async () => {
  vi.mocked(promptNoEnvScenario).mockResolvedValue({
    compareFile: { path: '/env/.env', name: '.env' },
  });
  vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });
  vi.mocked(processComparisonFile).mockReturnValue({
    scanResult: { ...baseScanResult },
    comparedAgainst: '.env',
    fix: { fixApplied: false, removedDuplicates: [], addedEnv: [], gitignoreUpdated: false },
  } as any);

  await scanUsage({ ...baseOpts, isCiMode: false, json: false });

  expect(promptNoEnvScenario).toHaveBeenCalled();
  expect(processComparisonFile).toHaveBeenCalled();
});

  it('sets frameworkWarnings on scanResult when frameworkValidator returns results', async () => {
    const { frameworkValidator } =
      await import('../../../src/core/frameworks/frameworkValidator.js');
    vi.mocked(frameworkValidator).mockReturnValue([
      {
        variable: 'API_KEY',
        reason: 'exposed',
        file: 'app.ts',
        line: 1,
        framework: 'nextjs',
      },
    ]);
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        frameworkWarnings: expect.arrayContaining([
          expect.objectContaining({ variable: 'API_KEY' }),
        ]),
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('continues when comparison error has shouldExit false', async () => {
    vi.mocked(determineComparisonFile).mockResolvedValue({
      type: 'found',
      file: { path: '/env/.env', name: '.env' },
    });
    vi.mocked(processComparisonFile).mockReturnValue({
      error: { message: 'soft error', shouldExit: false },
    } as any);
    vi.mocked(printComparisonError).mockReturnValue({ exit: false });

    const result = await scanUsage(baseOpts);

    expect(result.exitWithError).toBe(false);
  });

  it('transfers uppercaseWarnings, expireWarnings and inconsistentNamingWarnings to scanResult', async () => {
    vi.mocked(determineComparisonFile).mockResolvedValue({
      type: 'found',
      file: { path: '/env/.env', name: '.env' },
    });
    vi.mocked(processComparisonFile).mockReturnValue({
      scanResult: { ...baseScanResult },
      comparedAgainst: '.env',
      fix: {
        fixApplied: false,
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
      uppercaseWarnings: [{ key: 'myKey', suggestion: 'MY_KEY' }],
      expireWarnings: [{ key: 'OLD_KEY', date: '2024-01-01', daysLeft: -10 }],
      inconsistentNamingWarnings: [{ key1: 'A', key2: 'B', suggestion: 'A_B' }],
    } as any);

    await scanUsage(baseOpts);

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        uppercaseWarnings: expect.arrayContaining([
          expect.objectContaining({ key: 'myKey' }),
        ]),
        expireWarnings: expect.arrayContaining([
          expect.objectContaining({ key: 'OLD_KEY' }),
        ]),
        inconsistentNamingWarnings: expect.arrayContaining([
          expect.objectContaining({ key1: 'A' }),
        ]),
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('sets exampleWarnings when comparedAgainst matches DEFAULT_EXAMPLE_FILE', async () => {
    const { DEFAULT_EXAMPLE_FILE } =
      await import('../../../src/config/constants.js');

    vi.mocked(determineComparisonFile).mockResolvedValue({
      type: 'found',
      file: { path: '/env/.env.example', name: DEFAULT_EXAMPLE_FILE },
    });
    vi.mocked(processComparisonFile).mockReturnValue({
      scanResult: { ...baseScanResult },
      comparedAgainst: DEFAULT_EXAMPLE_FILE,
      exampleFull: { SECRET: 'abc123' },
      fix: {
        fixApplied: false,
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
    } as any);

    await scanUsage(baseOpts);

    const { detectSecretsInExample } =
      await import('../../../src/core/security/exampleSecretDetector.js');
    expect(detectSecretsInExample).toHaveBeenCalledWith({ SECRET: 'abc123' });
  });

  it('does not set exampleWarnings when comparedAgainst is not the default example file', async () => {
    vi.mocked(determineComparisonFile).mockResolvedValue({
      type: 'found',
      file: { path: '/env/.env', name: '.env' },
    });
    vi.mocked(processComparisonFile).mockReturnValue({
      scanResult: { ...baseScanResult },
      comparedAgainst: '.env',
      exampleFull: { SECRET: 'abc123' },
      fix: {
        fixApplied: false,
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
    } as any);

    await scanUsage(baseOpts);

    const { detectSecretsInExample } =
      await import('../../../src/core/security/exampleSecretDetector.js');
    expect(detectSecretsInExample).not.toHaveBeenCalled();
  });

  it('filters out commented usages before processing', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      used: [
        {
          variable: 'A',
          file: 'f.ts',
          line: 1,
          column: 0,
          pattern: 'process.env',
          context: '// process.env.A',
        },
        {
          variable: 'B',
          file: 'f.ts',
          line: 2,
          column: 0,
          pattern: 'process.env',
          context: 'process.env.B',
        },
      ],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        used: expect.arrayContaining([
          expect.objectContaining({ variable: 'B' }),
        ]),
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        used: expect.not.arrayContaining([
          expect.objectContaining({ variable: 'A' }),
        ]),
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('returns exitWithError true in JSON strict mode for each warning type', async () => {
    const cases: Partial<ScanResult>[] = [
      { duplicates: { env: [{ key: 'A', count: 2 }] } },
      { duplicates: { example: [{ key: 'B', count: 2 }] } },
      {
        secrets: [
          {
            file: 'f.ts',
            line: 1,
            kind: 'pattern',
            message: 'x',
            snippet: 'y',
            severity: 'low',
          },
        ],
      },
      {
        frameworkWarnings: [
          {
            variable: 'A',
            reason: 'r',
            file: 'f.ts',
            line: 1,
            framework: 'nextjs',
          },
        ],
      },
      {
        logged: [
          {
            variable: 'A',
            file: 'f.ts',
            line: 1,
            column: 0,
            pattern: 'process.env',
            context: '',
          },
        ],
      },
      { uppercaseWarnings: [{ key: 'a', suggestion: 'A' }] },
      { expireWarnings: [{ key: 'K', date: '2020-01-01', daysLeft: -100 }] },
      {
        inconsistentNamingWarnings: [
          { key1: 'A', key2: 'B', suggestion: 'A_B' },
        ],
      },
    ];

    for (const extra of cases) {
      vi.mocked(scanCodebase).mockResolvedValue({
        ...baseScanResult,
        ...extra,
      });

      const result = await scanUsage({ ...baseOpts, json: true, strict: true });

      expect(result.exitWithError).toBe(true);
    }
  });
});
