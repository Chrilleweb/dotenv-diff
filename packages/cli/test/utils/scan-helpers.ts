import type { ScanResult } from '../../src/config/types.js';

/**
 * Builds a complete, empty ScanResult for tests.
 * @param overrides - Fields to override
 * @returns ScanResult with every list empty and zeroed stats
 */
export function makeScanResult(
  overrides: Partial<ScanResult> = {},
): ScanResult {
  return {
    used: [],
    missing: [],
    unused: [],
    declaredKeys: [],
    stats: {
      filesScanned: 0,
      totalUsages: 0,
      uniqueVariables: 0,
      warningsCount: 0,
      duration: 0,
    },
    secrets: [],
    duplicates: { env: [], example: [] },
    frameworkWarnings: [],
    exampleWarnings: [],
    logged: [],
    uppercaseWarnings: [],
    expireWarnings: [],
    inconsistentNamingWarnings: [],
    commentWarnings: [],
    driftWarnings: [],
    suggestions: [],
    fileContentMap: new Map(),
    ...overrides,
  };
}
