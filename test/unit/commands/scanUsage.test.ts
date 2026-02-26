import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ScanUsageOptions,
  ScanResult,
} from '../../../src/config/types.js';
import { type SecretFinding } from '../../../src/core/security/secretDetectors.js';

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

vi.mock('../../../src/services/prompts/promptNoEnvScenario.js', () => ({
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
});