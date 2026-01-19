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
});
