import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ScanUsageOptions,
  ScanResult,
} from '../../../src/config/types.js';
import { type SecretFinding } from '../../../src/core/security/secretDetectors.js';
import { promptNoEnvScenario } from '../../../src/commands/prompts/promptNoEnvScenario.js';
import type { ProcessComparisonResult } from '../../../src/services/processComparisonFile.js';

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
import { frameworkValidator } from '../../../src/core/frameworks/frameworkValidator.js';

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
    vi.mocked(promptNoEnvScenario).mockResolvedValue({
      compareFile: undefined,
    });
    vi.mocked(frameworkValidator).mockReturnValue([]);
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
    } as ProcessComparisonResult);

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

  it('does not return error in JSON mode for non-high example warnings when strict is false', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      exampleWarnings: [
        {
          key: 'EXAMPLE_KEY',
          value: 'placeholder-but-flagged',
          reason: 'Entropy',
          severity: 'medium',
        },
      ],
    } as ScanResult);

    const result = await scanUsage({ ...baseOpts, json: true, strict: false });

    expect(result.exitWithError).toBe(false);
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

  it('returns error in JSON mode when expiration warning is urgent (<=7 days)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      expireWarnings: [{ key: 'TOKEN', date: '2026-03-10', daysLeft: 7 }],
    });

    const result = await scanUsage({ ...baseOpts, json: true, strict: false });

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
      envVariables: {},
      duplicatesFound: false,
      dupsEnv: [],
      dupsEx: [],
      fix: {
        fixApplied: false,
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
    } as ProcessComparisonResult);

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
    } as ProcessComparisonResult);
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
      envVariables: {},
      duplicatesFound: false,
      dupsEnv: [],
      dupsEx: [],
      fix: {
        fixApplied: false,
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
      uppercaseWarnings: [{ key: 'myKey', suggestion: 'MY_KEY' }],
      expireWarnings: [{ key: 'OLD_KEY', date: '2024-01-01', daysLeft: -10 }],
      inconsistentNamingWarnings: [{ key1: 'A', key2: 'B', suggestion: 'A_B' }],
    } as ProcessComparisonResult);

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
      envVariables: {},
      duplicatesFound: false,
      dupsEnv: [],
      dupsEx: [],
      exampleFull: { SECRET: 'abc123' },
      fix: {
        fixApplied: false,
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
    } as ProcessComparisonResult);

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
      envVariables: {},
      duplicatesFound: false,
      dupsEnv: [],
      dupsEx: [],
      exampleFull: { SECRET: 'abc123' },
      fix: {
        fixApplied: false,
        removedDuplicates: [],
        addedEnv: [],
        gitignoreUpdated: false,
      },
    } as ProcessComparisonResult);

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

  it('removes logged warning for block-commented console env usage', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      used: [
        {
          variable: 'TEST_KEY',
          file: 'src/index.ts',
          line: 4,
          column: 1,
          pattern: 'process.env',
          context: '/* console.log(process.env.TEST_KEY); */',
          isLogged: true,
        },
      ],
      logged: [
        {
          variable: 'TEST_KEY',
          file: 'src/index.ts',
          line: 4,
          column: 1,
          pattern: 'process.env',
          context: '/* console.log(process.env.TEST_KEY); */',
          isLogged: true,
        },
      ],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        logged: [],
        used: [],
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
        used: [
          {
            variable: 'A',
            file: 'f.ts',
            line: 1,
            column: 0,
            pattern: 'process.env',
            context: 'console.log(process.env.A)',
            isLogged: true,
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

  it('filters out usages on HTML comment closing lines (-->)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      used: [
        {
          variable: 'A',
          file: 'f.ts',
          line: 1,
          column: 0,
          pattern: 'process.env',
          context: '--> process.env.A',
        },
      ],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({ used: [] }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('filters out the dotenv-diff-ignore-end line itself', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      used: [
        {
          variable: 'END_LINE',
          file: 'f.ts',
          line: 1,
          column: 0,
          pattern: 'process.env',
          context: '<!-- dotenv-diff-ignore-end -->',
        },
      ],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({ used: [] }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('filters out the dotenv-diff-ignore-start line itself and subsequent usages inside block (line 217-218)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      used: [
        {
          variable: 'START_LINE',
          file: 'f.ts',
          line: 1,
          column: 0,
          pattern: 'process.env',
          context: '<!-- dotenv-diff-ignore-start -->',
        },
        {
          variable: 'INSIDE_BLOCK',
          file: 'f.ts',
          line: 2,
          column: 0,
          pattern: 'process.env',
          context: 'process.env.INSIDE_BLOCK',
        },
      ],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({ used: [] }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('passes false to printComparisonError when json is not set (line 105)', async () => {
    vi.mocked(determineComparisonFile).mockResolvedValue({
      type: 'found',
      file: { path: '/env/.env', name: '.env' },
    });
    vi.mocked(processComparisonFile).mockReturnValue({
      error: { message: 'err', shouldExit: false },
    } as ProcessComparisonResult);
    vi.mocked(printComparisonError).mockReturnValue({ exit: false });

    const { json: _omit, ...optsWithoutJson } = baseOpts;
    await scanUsage(optsWithoutJson as ScanUsageOptions);

    expect(printComparisonError).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Boolean),
      false,
    );
  });

  it('handles undefined secrets gracefully in JSON mode (line 143)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      secrets: undefined as unknown as SecretFinding[],
    });

    const result = await scanUsage({ ...baseOpts, json: true });

    expect(result.exitWithError).toBe(false);
  });

  it('returns false in strict JSON mode when there are no violations (lines 163-175)', async () => {
    const result = await scanUsage({ ...baseOpts, json: true, strict: true });

    expect(result.exitWithError).toBe(false);
  });

  it('exits in strict JSON mode when exampleWarnings exist (line 175)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      exampleWarnings: [
        { key: 'SECRET', value: 'abc', reason: 'Entropy', severity: 'low' },
      ],
    } as ScanResult);

    const result = await scanUsage({ ...baseOpts, json: true, strict: true });

    expect(result.exitWithError).toBe(true);
  });

  it('keeps usage with no context (line 207)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      used: [
        {
          variable: 'NO_CONTEXT_KEY',
          file: 'f.ts',
          line: 1,
          column: 0,
          pattern: 'process.env',
          context: undefined as unknown as string,
        },
      ],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        used: [expect.objectContaining({ variable: 'NO_CONTEXT_KEY' })],
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('filters usage inside unclosed HTML comment block (line 220)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      used: [
        {
          variable: 'INSIDE_HTML_COMMENT',
          file: 'f.ts',
          line: 1,
          column: 0,
          pattern: 'process.env',
          context: '<!-- unclosed comment process.env.INSIDE_HTML_COMMENT',
        },
        {
          variable: 'AFTER_OPEN',
          file: 'f.ts',
          line: 2,
          column: 0,
          pattern: 'process.env',
          context: 'process.env.AFTER_OPEN',
        },
      ],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({ used: [] }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('handles undefined logged and secrets in calculateStats (lines 249, 253)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      logged: undefined as unknown as ScanResult['logged'],
      secrets: undefined as unknown as ScanResult['secrets'],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    // Should not throw even when logged/secrets are undefined
    await expect(
      scanUsage({ ...baseOpts, isCiMode: true }),
    ).resolves.not.toThrow();
    expect(printScanResult).toHaveBeenCalled();
  });

  it('resumes keeping usages after dotenv-diff-ignore-end (line 222-223)', async () => {
    vi.mocked(scanCodebase).mockResolvedValue({
      ...baseScanResult,
      used: [
        {
          variable: 'START_LINE',
          file: 'f.ts',
          line: 1,
          column: 0,
          pattern: 'process.env',
          context: '<!-- dotenv-diff-ignore-start -->',
        },
        {
          variable: 'INSIDE_BLOCK',
          file: 'f.ts',
          line: 2,
          column: 0,
          pattern: 'process.env',
          context: 'process.env.INSIDE_BLOCK',
        },
        {
          variable: 'END_MARKER',
          file: 'f.ts',
          line: 3,
          column: 0,
          pattern: 'process.env',
          context: '<!-- dotenv-diff-ignore-end -->',
        },
        {
          variable: 'AFTER_BLOCK',
          file: 'f.ts',
          line: 4,
          column: 0,
          pattern: 'process.env',
          context: 'process.env.AFTER_BLOCK',
        },
      ],
    });
    vi.mocked(determineComparisonFile).mockResolvedValue({ type: 'none' });

    await scanUsage({ ...baseOpts, isCiMode: true });

    expect(printScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        used: [expect.objectContaining({ variable: 'AFTER_BLOCK' })],
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
