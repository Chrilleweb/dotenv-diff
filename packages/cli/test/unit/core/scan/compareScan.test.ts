import { describe, it, expect } from 'vitest';
import { compareWithEnvFiles } from '../../../../src/core/scan/compareScan.js';
import type { EnvUsage, ScanResult } from '../../../../src/config/types.js';

/**
 * Builds a complete EnvUsage for a variable, optionally at a specific file path.
 */
function usage(variable: string, file = ''): EnvUsage {
  return {
    variable,
    file,
    line: 1,
    column: 0,
    pattern: 'process.env',
    context: '',
  };
}

/**
 * Builds a minimal but fully-typed ScanResult, with optional overrides.
 */
function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    used: [],
    missing: [],
    unused: [],
    stats: {
      filesScanned: 0,
      totalUsages: 0,
      uniqueVariables: 0,
      warningsCount: 0,
      duration: 0,
    },
    secrets: [],
    duplicates: {},
    logged: [],
    ...overrides,
  };
}

describe('compareWithEnvFiles', () => {
  it('detects missing variables', () => {
    const result = compareWithEnvFiles(
      makeScanResult({ used: [usage('API_KEY')] }),
      {},
    );

    expect(result.missing).toEqual(['API_KEY']);
    expect(result.unused).toEqual([]);
  });

  it('detects unused variables', () => {
    const result = compareWithEnvFiles(makeScanResult(), { API_KEY: '123' });

    expect(result.missing).toEqual([]);
    expect(result.unused).toEqual(['API_KEY']);
  });

  it('detects both missing and unused variables', () => {
    const result = compareWithEnvFiles(makeScanResult({ used: [usage('A')] }), {
      B: 'x',
    });

    expect(result.missing).toEqual(['A']);
    expect(result.unused).toEqual(['B']);
  });

  it('does not report a config-schema declared key as unused', () => {
    const result = compareWithEnvFiles(
      makeScanResult({ declaredKeys: ['CLIENT_SECRET_GITHUB'] }),
      { CLIENT_SECRET_GITHUB: 'x', REALLY_UNUSED: 'y' },
    );

    // Declared via a loader schema → not unused; the truly unreferenced key stays.
    expect(result.unused).toEqual(['REALLY_UNUSED']);
  });

  it('ignores declared keys that are not present in the env file', () => {
    const result = compareWithEnvFiles(
      makeScanResult({ declaredKeys: ['NOT_IN_ENV'] }),
      { REALLY_UNUSED: 'y' },
    );

    expect(result.unused).toEqual(['REALLY_UNUSED']);
  });

  it('preserves other ScanResult fields', () => {
    const scanResult = makeScanResult({
      stats: {
        filesScanned: 1,
        totalUsages: 0,
        uniqueVariables: 0,
        warningsCount: 0,
        duration: 0,
      },
    });

    const result = compareWithEnvFiles(scanResult, {});

    expect(result.stats).toEqual(scanResult.stats);
  });

  describe('monorepo scope-aware missing detection', () => {
    it('treats a variable as defined when a nested example scope documents it', () => {
      const result = compareWithEnvFiles(
        makeScanResult({
          used: [usage('OPENAI_API_KEY', 'upgrade-impact/src/ai.ts')],
        }),
        {},
        [],
        [],
        [{ dir: 'upgrade-impact', keys: new Set(['OPENAI_API_KEY']) }],
      );

      expect(result.missing).toEqual([]);
    });

    it('reports missing when the usage is outside the scope directory', () => {
      const result = compareWithEnvFiles(
        makeScanResult({ used: [usage('OPENAI_API_KEY', 'e2e/run.ts')] }),
        {},
        [],
        [],
        [{ dir: 'upgrade-impact', keys: new Set(['OPENAI_API_KEY']) }],
      );

      expect(result.missing).toEqual(['OPENAI_API_KEY']);
    });

    it('covers a usage in a nested subdirectory of the scope (descendant)', () => {
      const result = compareWithEnvFiles(
        makeScanResult({
          used: [usage('KEY', 'api/src/deep/nested/file.ts')],
        }),
        {},
        [],
        [],
        [{ dir: 'api', keys: new Set(['KEY']) }],
      );

      expect(result.missing).toEqual([]);
    });

    it('covers a usage in a file directly inside the scope directory (equal dir)', () => {
      const result = compareWithEnvFiles(
        makeScanResult({ used: [usage('KEY', 'api/index.ts')] }),
        {},
        [],
        [],
        [{ dir: 'api', keys: new Set(['KEY']) }],
      );

      expect(result.missing).toEqual([]);
    });

    it('lets the primary (root) file cover usages anywhere, even with scopes present', () => {
      const result = compareWithEnvFiles(
        makeScanResult({
          used: [usage('DATABASE_URL', 'upgrade-impact/src/ai.ts')],
        }),
        { DATABASE_URL: '' },
        [],
        [],
        [{ dir: 'upgrade-impact', keys: new Set(['OPENAI_API_KEY']) }],
      );

      expect(result.missing).toEqual([]);
    });

    it('reports missing when a variable is used both inside and outside its scope', () => {
      const result = compareWithEnvFiles(
        makeScanResult({
          used: [usage('KEY', 'api/src/ai.ts'), usage('KEY', 'web/src/ai.ts')],
        }),
        {},
        [],
        [],
        [{ dir: 'api', keys: new Set(['KEY']) }],
      );

      expect(result.missing).toEqual(['KEY']);
    });

    it('covers a root-level usage (no directory) via the primary file', () => {
      const result = compareWithEnvFiles(
        makeScanResult({ used: [usage('KEY', 'index.ts')] }),
        {},
        [],
        [],
        [{ dir: 'api', keys: new Set(['KEY']) }],
      );

      // Root-level file is not within the "api" scope, so it stays missing.
      expect(result.missing).toEqual(['KEY']);
    });
  });
});
