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

vi.mock('../../../src/core/parseEnv.js', () => ({
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

import { processComparisonFile } from '../../../src/services/processComparisonFile.js';
import { applyFixes } from '../../../src/core/fixEnv.js';

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
    include: [],
    exclude: [],
    ignore: [],
    ignoreRegex: [],
    secrets: false,
    json: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
});
