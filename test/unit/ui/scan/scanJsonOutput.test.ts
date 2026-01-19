import { describe, it, expect } from 'vitest';
import { scanJsonOutput } from '../../../../src/ui/scan/scanJsonOutput.js';
import type { ScanResult } from '../../../../src/config/types.js';

function makeScanResult(partial: Partial<ScanResult> = {}): ScanResult {
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
    frameworkWarnings: [],
    exampleWarnings: [],
    uppercaseWarnings: [],
    expireWarnings: [],
    inconsistentNamingWarnings: [],
    ...partial,
  };
}

describe('scanJsonOutput', () => {
  it('includes comparedAgainst when provided', () => {
    const scanResult = makeScanResult();

    const result = scanJsonOutput(scanResult, '.env');

    expect(result.comparedAgainst).toBe('.env');
  });

  it('omits optional fields when empty', () => {
    const scanResult = makeScanResult();

    const result = scanJsonOutput(scanResult, '');

    expect(result.secrets).toBeUndefined();
    expect(result.missing).toBeUndefined();
    expect(result.unused).toBeUndefined();
  });

  it('normalizes file paths in secrets', () => {
    const scanResult = makeScanResult({
      secrets: [
        {
          file: 'src\\file.ts',
          line: 1,
          message: 'secret',
          snippet: 'ABC',
          severity: 'high',
          kind: 'pattern',
        },
      ],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.secrets?.[0].file).toBe('src/file.ts');
  });

  it('includes missing variables with their usages', () => {
    const scanResult = makeScanResult({
      missing: ['API_KEY', 'DB_URL'],
      used: [
        {
          variable: 'API_KEY',
          file: 'src\\api.ts',
          line: 10,
          column: 0,
          pattern: 'process.env',
          context: 'const key = process.env.API_KEY',
        },
        {
          variable: 'API_KEY',
          file: 'src\\config.ts',
          line: 5,
          column: 0,
          pattern: 'process.env',
          context: 'apiKey: process.env.API_KEY',
        },
        {
          variable: 'DB_URL',
          file: 'src\\db.ts',
          line: 3,
          column: 0,
          pattern: 'process.env',
          context: 'url: process.env.DB_URL',
        },
      ],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.missing).toHaveLength(2);
    expect(result.missing?.[0].variable).toBe('API_KEY');
    expect(result.missing?.[0].usages).toHaveLength(2);
    expect(result.missing?.[0].usages[0].file).toBe('src/api.ts');
    expect(result.missing?.[1].variable).toBe('DB_URL');
    expect(result.missing?.[1].usages).toHaveLength(1);
  });

  it('handles missing variables without usages and filters non-missing usages', () => {
    const scanResult = makeScanResult({
      missing: ['MISSING_KEY', 'UNUSED_MISSING'],
      used: [
        {
          variable: 'MISSING_KEY',
          file: 'src\\app.ts',
          line: 15,
          column: 0,
          pattern: 'process.env',
          context: 'key: process.env.MISSING_KEY',
        },
        {
          variable: 'EXISTING_VAR',
          file: 'src\\other.ts',
          line: 20,
          column: 0,
          pattern: 'process.env',
          context: 'val: process.env.EXISTING_VAR',
        },
      ],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.missing).toHaveLength(2);
    expect(result.missing?.[0].variable).toBe('MISSING_KEY');
    expect(result.missing?.[0].usages).toHaveLength(1);
    expect(result.missing?.[1].variable).toBe('UNUSED_MISSING');
    expect(result.missing?.[1].usages).toHaveLength(0);
  });

  it('includes unused variables', () => {
    const scanResult = makeScanResult({
      unused: ['OLD_KEY', 'DEPRECATED_VAR'],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.unused).toEqual(['OLD_KEY', 'DEPRECATED_VAR']);
  });

  it('includes uppercase warnings', () => {
    const scanResult = makeScanResult({
      uppercaseWarnings: [
        { key: 'apiKey', suggestion: 'API_KEY' },
        { key: 'dbUrl', suggestion: 'DB_URL' },
      ],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.uppercaseWarnings).toHaveLength(2);
    expect(result.uppercaseWarnings?.[0]).toEqual({
      key: 'apiKey',
      suggestion: 'API_KEY',
    });
  });

  it('includes inconsistent naming warnings', () => {
    const scanResult = makeScanResult({
      inconsistentNamingWarnings: [
        {
          key1: 'API_KEY',
          key2: 'api_key',
          suggestion: 'API_KEY',
        },
      ],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.inconsistentNamingWarnings).toHaveLength(1);
    expect(result.inconsistentNamingWarnings?.[0]).toEqual({
      key1: 'API_KEY',
      key2: 'api_key',
      suggestion: 'API_KEY',
    });
  });

  it('includes framework warnings with normalized paths', () => {
    const scanResult = makeScanResult({
      frameworkWarnings: [
        {
          variable: 'PUBLIC_API_KEY',
          reason: 'Should use VITE_ prefix',
          file: 'src\\config.ts',
          line: 5,
          framework: 'sveltekit',
        },
      ],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.frameworkWarnings).toHaveLength(1);
    expect(result.frameworkWarnings?.[0].file).toBe('src/config.ts');
    expect(result.frameworkWarnings?.[0].framework).toBe('sveltekit');
  });

  it('includes duplicates when present', () => {
    const scanResult = makeScanResult({
      duplicates: {
        env: [{ key: 'API_KEY', count: 2 }],
        example: [{ key: 'DB_URL', count: 3 }],
      },
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.duplicates).toBeDefined();
    expect(result.duplicates?.env).toHaveLength(1);
    expect(result.duplicates?.example).toHaveLength(1);
  });

  it('omits duplicates when none exist', () => {
    const scanResult = makeScanResult({
      duplicates: { env: [], example: [] },
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.duplicates).toBeUndefined();
  });

  it('includes logged variables with normalized paths', () => {
    const scanResult = makeScanResult({
      logged: [
        {
          variable: 'SECRET_KEY',
          file: 'src\\logger.ts',
          column: 0,
          line: 42,
          pattern: 'process.env',
          context: 'console.log(process.env.SECRET_KEY)',
        },
      ],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.logged).toHaveLength(1);
    expect(result.logged?.[0].file).toBe('src/logger.ts');
    expect(result.logged?.[0].variable).toBe('SECRET_KEY');
  });

  it('includes example warnings', () => {
    const scanResult = makeScanResult({
      exampleWarnings: [
        {
          key: 'DB_PASSWORD',
          value: 'password123',
          reason: 'Contains common password pattern',
          severity: 'high',
        },
      ],
    });

    const result = scanJsonOutput(scanResult, '');

    expect(result.exampleWarnings).toHaveLength(1);
    expect(result.exampleWarnings?.[0]).toEqual({
      key: 'DB_PASSWORD',
      value: 'password123',
      reason: 'Contains common password pattern',
      severity: 'high',
    });
  });

  it('includes healthScore', () => {
    const scanResult = makeScanResult();

    const result = scanJsonOutput(scanResult, '');

    expect(result.healthScore).toBeDefined();
    expect(typeof result.healthScore).toBe('number');
  });
});
