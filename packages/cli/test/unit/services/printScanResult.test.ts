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

vi.mock('../../../src/ui/scan/printUnused.js', () => ({
  printUnused: vi.fn(),
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

vi.mock('../../../src/ui/scan/printInconsistentNamingWarning.js', () => ({
  printInconsistentNamingWarning: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printListAll.js', () => ({
  printListAll: vi.fn(),
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

vi.mock('../../../src/services/git.js', () => ({
  checkGitignoreStatus: vi.fn(() => null),
}));

import { printScanResult } from '../../../src/services/printScanResult.js';
import { printMissing } from '../../../src/ui/scan/printMissing.js';
import { printAutoFix } from '../../../src/ui/shared/printAutoFix.js';
import { checkGitignoreStatus } from '../../../src/services/git.js';
import { printGitignoreWarning } from '../../../src/ui/shared/printGitignore.js';
import { printStats } from '../../../src/ui/scan/printStats.js';
import { printDuplicates } from '../../../src/ui/shared/printDuplicates.js';
import { printUnused } from '../../../src/ui/scan/printUnused.js';
import { printFrameworkWarnings } from '../../../src/ui/scan/printFrameworkWarnings.js';
import { printUppercaseWarning } from '../../../src/ui/scan/printUppercaseWarning.js';
import { printInconsistentNamingWarning } from '../../../src/ui/scan/printInconsistentNamingWarning.js';
import { printListAll } from '../../../src/ui/scan/printListAll.js';
import { printExampleWarnings } from '../../../src/ui/scan/printExampleWarnings.js';
import { printSecrets } from '../../../src/ui/scan/printSecrets.js';
import { printExpireWarnings } from '../../../src/ui/scan/printExpireWarnings.js';
import { printConsolelogWarning } from '../../../src/ui/scan/printConsolelogWarning.js';
import type { SecretFinding } from '../../../src/core/security/secretDetectors.js';
import type {
  FrameworkWarning,
  UppercaseWarning,
  InconsistentNamingWarning,
  ExampleSecretWarning,
  ExpireWarning,
} from '../../../src/config/types.js';
import { GITIGNORE_ISSUES } from '../../../src/config/constants.js';

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
    vi.mocked(checkGitignoreStatus).mockReturnValue(null);
  });

  it('returns exitWithError true when missing variables exist', () => {
    vi.mocked(printMissing).mockReturnValue(true);

    const result = printScanResult(baseScanResult, baseOpts, '.env');

    expect(result.exitWithError).toBe(true);
  });

  it('returns exitWithError true when high severity secret exists', () => {
    const secret: SecretFinding = {
      file: 'test.ts',
      line: 1,
      kind: 'pattern',
      message: 'test',
      snippet: 'test',
      severity: 'high',
    };
    const result = printScanResult(
      {
        ...baseScanResult,
        secrets: [secret],
      },
      baseOpts,
      '.env',
    );

    expect(result.exitWithError).toBe(true);
  });

  it('returns exitWithError true when strict mode triggers exit', () => {
    const result = printScanResult(
      {
        ...baseScanResult,
        unused: ['SOME_VAR'],
      },
      { ...baseOpts, strict: true },
      '.env',
    );

    expect(result.exitWithError).toBe(true);
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

  it('prints gitignore warning when env file is not ignored', () => {
    vi.mocked(checkGitignoreStatus).mockReturnValue({
      reason: GITIGNORE_ISSUES.NOT_IGNORED,
    });

    printScanResult(baseScanResult, baseOpts, '.env');

    expect(printGitignoreWarning).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'not-ignored', strict: false }),
    );
  });

  it('returns exitWithError true in strict mode when gitignore issue exists', () => {
    vi.mocked(checkGitignoreStatus).mockReturnValue({
      reason: GITIGNORE_ISSUES.NOT_IGNORED,
    });

    const result = printScanResult(
      baseScanResult,
      { ...baseOpts, strict: true },
      '.env',
    );

    expect(result.exitWithError).toBe(true);
  });

  it('prints framework warnings when present', () => {
    const warning: FrameworkWarning = {
      variable: 'API_KEY',
      reason: 'exposed',
      file: 'app.ts',
      line: 1,
      framework: 'nextjs',
    };
    printScanResult(
      {
        ...baseScanResult,
        frameworkWarnings: [warning],
      },
      baseOpts,
      '.env',
    );

    expect(printFrameworkWarnings).toHaveBeenCalled();
  });

  it('prints uppercase warnings when present', () => {
    const warning: UppercaseWarning = {
      key: 'Api_Key',
      suggestion: 'API_KEY',
    };
    printScanResult(
      {
        ...baseScanResult,
        uppercaseWarnings: [warning],
      },
      baseOpts,
      '.env',
    );

    expect(printUppercaseWarning).toHaveBeenCalled();
  });

  it('prints inconsistent naming warnings when present', () => {
    const warning: InconsistentNamingWarning = {
      key1: 'API_KEY',
      key2: 'APIKEY',
      suggestion: 'API_KEY',
    };
    printScanResult(
      {
        ...baseScanResult,
        inconsistentNamingWarnings: [warning],
      },
      baseOpts,
      '.env',
    );

    expect(printInconsistentNamingWarning).toHaveBeenCalled();
  });

  it('prints example warnings when present', () => {
    const warning: ExampleSecretWarning = {
      key: 'SECRET_VAR',
      value: 'suspicious_value',
      reason: 'Entropy',
      severity: 'low',
    };
    printScanResult(
      {
        ...baseScanResult,
        exampleWarnings: [warning],
      },
      baseOpts,
      '.env',
    );

    expect(printExampleWarnings).toHaveBeenCalled();
  });

  it('prints secrets when secrets flag is enabled', () => {
    const secret: SecretFinding = {
      file: 'test.ts',
      line: 1,
      kind: 'pattern',
      message: 'test',
      snippet: 'test',
      severity: 'low',
    };
    printScanResult(
      {
        ...baseScanResult,
        secrets: [secret],
      },
      { ...baseOpts, secrets: true },
      '.env',
    );

    expect(printSecrets).toHaveBeenCalled();
  });

  it('prints expiration warnings when present', () => {
    const warning: ExpireWarning = {
      key: 'TOKEN',
      date: '2026-12-31',
      daysLeft: 5,
    };
    printScanResult(
      {
        ...baseScanResult,
        expireWarnings: [warning],
      },
      baseOpts,
      '.env',
    );

    expect(printExpireWarnings).toHaveBeenCalled();
  });

  it('returns exitWithError true when high severity example warning exists', () => {
    const warning: ExampleSecretWarning = {
      key: 'DB_PASSWORD',
      value: 'password123',
      reason: 'Pattern',
      severity: 'high',
    };
    const result = printScanResult(
      {
        ...baseScanResult,
        exampleWarnings: [warning],
      },
      baseOpts,
      '.env',
    );

    expect(result.exitWithError).toBe(true);
  });

  it('returns exitWithError true when expiration warning is urgent (<=7 days)', () => {
    const warning: ExpireWarning = {
      key: 'TOKEN',
      date: '2026-03-10',
      daysLeft: 7,
    };
    const result = printScanResult(
      {
        ...baseScanResult,
        expireWarnings: [warning],
      },
      baseOpts,
      '.env',
    );

    expect(result.exitWithError).toBe(true);
  });

  it('checks gitignore status with cwd and default env file', () => {
    printScanResult(baseScanResult, baseOpts, '.env');

    expect(checkGitignoreStatus).toHaveBeenCalledWith({
      cwd: '/root',
      envFile: '.env',
    });
  });

  it('does not print stats when showStats is false', () => {
    printScanResult(baseScanResult, { ...baseOpts, showStats: false }, '.env');

    expect(printStats).not.toHaveBeenCalled();
  });

  it('uses default env file in duplicates when comparedAgainst is empty', () => {
    printScanResult(
      {
        ...baseScanResult,
        duplicates: {},
      },
      baseOpts,
      '',
    );

    expect(printDuplicates).toHaveBeenCalledWith(
      '.env',
      'example file',
      [],
      [],
      false,
      false,
      undefined,
    );
  });

  it('does not print console log warning when logged is undefined', () => {
    printScanResult(
      {
        ...baseScanResult,
        logged: [],
      },
      baseOpts,
      '.env',
    );

    expect(printConsolelogWarning).not.toHaveBeenCalled();
  });

  it('calls printConsolelogWarning when logged has items', () => {
    const loggedUsages = [
      {
        variable: 'SECRET_KEY',
        file: 'src/logger.ts',
        line: 42,
        column: 5,
        pattern: 'process.env' as const,
        context: 'console.log(process.env.SECRET_KEY)',
      },
    ];

    printScanResult(
      {
        ...baseScanResult,
        logged: loggedUsages,
      },
      baseOpts,
      '.env',
    );

    expect(printConsolelogWarning).toHaveBeenCalledWith(
      loggedUsages,
      undefined,
    );
  });

  it('keeps exitWithError false when secrets is undefined and no strict violations', () => {
    const result = printScanResult(
      {
        ...baseScanResult,
        secrets: undefined as unknown as [],
      },
      baseOpts,
      '.env',
    );

    expect(result.exitWithError).toBe(false);
  });

  it('evaluates full strict violation chain and stays false when all checks are clean', () => {
    const result = printScanResult(
      baseScanResult,
      { ...baseOpts, strict: true },
      '.env',
    );

    expect(result.exitWithError).toBe(false);
  });

  it('does not call printAutoFix when fix is true but no fixContext is provided', () => {
    printScanResult(baseScanResult, { ...baseOpts, fix: true }, '.env');

    expect(printAutoFix).not.toHaveBeenCalled();
  });

  it('does not print unused variables when showUnused is false', () => {
    printScanResult(
      {
        ...baseScanResult,
        unused: ['SOME_VAR'],
      },
      { ...baseOpts, showUnused: false },
      '.env',
    );

    expect(printUnused).not.toHaveBeenCalled();
  });

  it('does not call printAutoFix when fix is false even if fixContext exists', () => {
    printScanResult(baseScanResult, { ...baseOpts, fix: false }, '.env', {
      fixApplied: true,
      removedDuplicates: [],
      addedEnv: [],
      gitignoreUpdated: false,
    });

    expect(printAutoFix).not.toHaveBeenCalled();
  });

  it('calls printAutoFix with default env file when comparedAgainst is empty', () => {
    printScanResult(baseScanResult, { ...baseOpts, fix: true }, '', {
      fixApplied: true,
      removedDuplicates: [],
      addedEnv: [],
      gitignoreUpdated: false,
    });

    expect(printAutoFix).toHaveBeenCalledWith(
      expect.objectContaining({ fixApplied: true }),
      '.env',
      false,
    );
  });

  it('calls printListAll and returns early when listAll is true', () => {
    const usages = [
      {
        variable: 'API_KEY',
        file: 'src/index.ts',
        line: 1,
        column: 1,
        pattern: 'process.env' as const,
        context: 'process.env.API_KEY',
      },
    ];

    const result = printScanResult(
      { ...baseScanResult, used: usages },
      { ...baseOpts, listAll: true },
      '.env',
    );

    expect(printListAll).toHaveBeenCalledWith(usages);
    expect(result.exitWithError).toBe(false);
  });
});
