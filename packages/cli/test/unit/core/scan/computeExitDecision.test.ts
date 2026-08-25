import { describe, it, expect } from 'vitest';
import { computeExitDecision } from '../../../../src/core/scan/computeExitDecision.js';
import type { ScanResult } from '../../../../src/config/types.js';
import {
  EXPIRE_THRESHOLD_DAYS,
  URGENT_EXPIRE_DAYS,
} from '../../../../src/config/constants.js';

const base: ScanResult = {
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

/** Builds a scan result with the given overrides applied to the clean base. */
const scan = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  ...base,
  ...overrides,
});

describe('computeExitDecision', () => {
  it('passes on a clean scan', () => {
    expect(computeExitDecision(scan()).exitWithError).toBe(false);
    expect(computeExitDecision(scan(), { strict: true }).exitWithError).toBe(
      false,
    );
  });

  describe('hard failures (independent of --strict)', () => {
    it('fails on missing keys', () => {
      expect(
        computeExitDecision(scan({ missing: ['API_KEY'] })).exitWithError,
      ).toBe(true);
    });

    it('fails on a high severity secret but not a medium one', () => {
      const secret = (severity: 'high' | 'medium') =>
        scan({
          secrets: [
            {
              file: 'a.ts',
              line: 1,
              message: 'm',
              snippet: 's',
              severity,
            },
          ],
        });

      expect(computeExitDecision(secret('high')).exitWithError).toBe(true);
      expect(computeExitDecision(secret('medium')).exitWithError).toBe(false);
    });

    it('fails on a high severity example secret but not a low one', () => {
      const warning = (severity: 'high' | 'low') =>
        scan({
          exampleWarnings: [
            {
              key: 'K',
              value: 'v',
              file: '.env.example',
              message: 'r',
              severity,
            },
          ],
        });

      expect(computeExitDecision(warning('high')).exitWithError).toBe(true);
      expect(computeExitDecision(warning('low')).exitWithError).toBe(false);
    });

    it('fails on urgently expiring keys only', () => {
      const expiring = (daysLeft: number) =>
        scan({ expireWarnings: [{ key: 'K', date: '2030-01-01', daysLeft }] });

      expect(
        computeExitDecision(expiring(URGENT_EXPIRE_DAYS)).exitWithError,
      ).toBe(true);
      expect(
        computeExitDecision(expiring(URGENT_EXPIRE_DAYS + 1)).exitWithError,
      ).toBe(false);
    });
  });

  describe('strict violations', () => {
    const cases: Array<[string, Partial<ScanResult>]> = [
      ['unused keys', { unused: ['OLD_KEY'] }],
      [
        'duplicate keys',
        { duplicates: { file: '.env', keys: [{ key: 'K', count: 2 }] } },
      ],
      [
        'medium severity secrets',
        {
          secrets: [
            {
              file: 'a.ts',
              line: 1,
              message: 'm',
              snippet: 's',
              severity: 'medium',
            },
          ],
        },
      ],
      [
        'framework warnings',
        {
          frameworkWarnings: [
            {
              variable: 'V',
              reason: 'r',
              file: 'a.ts',
              line: 1,
              framework: 'nextjs',
            },
          ],
        },
      ],
      [
        'logged usages',
        {
          logged: [
            {
              variable: 'V',
              file: 'a.ts',
              line: 1,
              column: 1,
              pattern: 'process.env',
              context: 'c',
            },
          ],
        },
      ],
      [
        'uppercase warnings',
        { uppercaseWarnings: [{ key: 'k', suggestion: 'K' }] },
      ],
      [
        'expire warnings within the threshold',
        {
          expireWarnings: [
            { key: 'K', date: '2030-01-01', daysLeft: EXPIRE_THRESHOLD_DAYS },
          ],
        },
      ],
      [
        'inconsistent naming warnings',
        {
          inconsistentNamingWarnings: [
            { key1: 'A_B', key2: 'AB', suggestion: 'A_B' },
          ],
        },
      ],
      ['comment warnings', { commentWarnings: [{ key: 'K', line: 3 }] }],
    ];

    for (const [name, overrides] of cases) {
      it(`fails on ${name} only under --strict`, () => {
        expect(computeExitDecision(scan(overrides)).exitWithError).toBe(false);
        expect(
          computeExitDecision(scan(overrides), { strict: true }).exitWithError,
        ).toBe(true);
      });
    }

    it('does not fail on expire warnings beyond the strict threshold', () => {
      const result = computeExitDecision(
        scan({
          expireWarnings: [
            {
              key: 'K',
              date: '2030-01-01',
              daysLeft: EXPIRE_THRESHOLD_DAYS + 1,
            },
          ],
        }),
        { strict: true },
      );

      expect(result.exitWithError).toBe(false);
    });
  });

  describe('gitignore', () => {
    it('fails under --strict when the caller reports an issue', () => {
      expect(
        computeExitDecision(scan(), { strict: true, hasGitignoreIssue: true })
          .exitWithError,
      ).toBe(true);
    });

    it('does not fail without --strict', () => {
      expect(
        computeExitDecision(scan(), { hasGitignoreIssue: true }).exitWithError,
      ).toBe(false);
    });

    it('is ignored when the caller does not report it (JSON output path)', () => {
      expect(computeExitDecision(scan(), { strict: true }).exitWithError).toBe(
        false,
      );
    });
  });
});
