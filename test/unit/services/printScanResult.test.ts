import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ScanResult,
  ScanUsageOptions,
} from '../../../src/config/types.js';

vi.mock('../../../src/ui/scan/printHeader.js', () => ({
  printHeader: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printStats.js', () => ({
  printStats: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printMissing.js', () => ({
  printMissing: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printDuplicates.js', () => ({
  printDuplicates: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printSecrets.js', () => ({
  printSecrets: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printSuccess.js', () => ({
  printSuccess: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printStrictModeError.js', () => ({
  printStrictModeError: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printFixTips.js', () => ({
  printFixTips: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printAutoFix.js', () => ({
  printAutoFix: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printFrameworkWarnings.js', () => ({
  printFrameworkWarnings: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printExampleWarnings.js', () => ({
  printExampleWarnings: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printConsolelogWarning.js', () => ({
  printConsolelogWarning: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printUppercaseWarning.js', () => ({
  printUppercaseWarning: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printExpireWarnings.js', () => ({
  printExpireWarnings: vi.fn(),
}));

vi.mock('../../../src/core/scan/computeHealthScore.js', () => ({
  computeHealthScore: vi.fn(() => 100),
}));

vi.mock('../../../src/ui/scan/printHealthScore.js', () => ({
  printHealthScore: vi.fn(),
}));

vi.mock('../../../src/ui/shared/printGitignore.js', () => ({
  printGitignoreWarning: vi.fn(),
}));

vi.mock('../../../src/git.js', () => ({
  checkGitignoreStatus: vi.fn(() => null),
}));

import { printScanResult } from '../../../src/services/printScanResult.js';
import { printMissing } from '../../../src/ui/scan/printMissing.js';
import { printStrictModeError } from '../../../src/ui/shared/printStrictModeError.js';
import { printSuccess } from '../../../src/ui/shared/printSuccess.js';
import { printAutoFix } from '../../../src/ui/shared/printAutoFix.js';

describe('printScanResult', () => {
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
    vi.mocked(printMissing).mockReturnValue(false);
    vi.mocked(printStrictModeError).mockReturnValue(false);
  });

  it('returns exitWithError true when missing variables exist', () => {
    vi.mocked(printMissing).mockReturnValue(true);

    const result = printScanResult(baseScanResult, baseOpts, '.env');

    expect(result.exitWithError).toBe(true);
  });

  it('returns exitWithError true when high severity secret exists', () => {
    const result = printScanResult(
      {
        ...baseScanResult,
        secrets: [{ severity: 'high' } as any],
      },
      baseOpts,
      '.env',
    );

    expect(result.exitWithError).toBe(true);
  });

  it('returns exitWithError true when strict mode triggers exit', () => {
    vi.mocked(printStrictModeError).mockReturnValue(true);

    const result = printScanResult(
      baseScanResult,
      { ...baseOpts, strict: true },
      '.env',
    );

    expect(result.exitWithError).toBe(true);
  });

  it('calls success message when conditions met', () => {
    printScanResult(
      {
        ...baseScanResult,
        used: [{ variable: 'A' } as any],
      },
      baseOpts,
      '.env',
    );

    expect(printSuccess).toHaveBeenCalled();
  });

  it('calls printAutoFix when fix enabled', () => {
    printScanResult(baseScanResult, { ...baseOpts, fix: true }, '.env', {
      fixApplied: true,
      removedDuplicates: [],
      addedEnv: [],
      gitignoreUpdated: false,
    });

    expect(printAutoFix).toHaveBeenCalled();
  });

  it('returns false when no issues exist', () => {
    const result = printScanResult(baseScanResult, baseOpts, '.env');

    expect(result.exitWithError).toBe(false);
  });
});
