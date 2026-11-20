import type {
  ComparisonOptions,
  ScanOptions,
  ScanUsageOptions,
} from '../../src/config/types.js';

/**
 * Builds a complete ScanOptions object for tests.
 * @param overrides - Fields to override
 * @returns ScanOptions with test defaults
 */
export function makeScanOptions(
  overrides: Partial<ScanOptions> = {},
): ScanOptions {
  return {
    cwd: process.cwd(),
    includeFiles: [],
    excludeFiles: [],
    ignore: [],
    ignoreRegex: [],
    files: [],
    secrets: false,
    ignoreUrls: [],
    json: false,
    ...overrides,
  };
}

/**
 * Builds a complete ScanUsageOptions object for tests.
 * @param overrides - Fields to override
 * @returns ScanUsageOptions with test defaults
 */
export function makeScanUsageOptions(
  overrides: Partial<ScanUsageOptions> = {},
): ScanUsageOptions {
  return {
    ...makeScanOptions(),
    envPath: undefined,
    examplePath: undefined,
    fix: false,
    showUnused: true,
    showStats: true,
    isCiMode: false,
    isYesMode: false,
    allowDuplicates: false,
    strict: false,
    uppercaseKeys: false,
    expireWarnings: false,
    inconsistentNamingWarnings: false,
    commentWarnings: false,
    driftWarnings: false,
    listAll: false,
    baseline: false,
    suggest: true,
    ...overrides,
  };
}

/**
 * Builds a complete ComparisonOptions object for tests.
 * @param overrides - Fields to override
 * @returns ComparisonOptions with test defaults
 */
export function makeComparisonOptions(
  overrides: Partial<ComparisonOptions> = {},
): ComparisonOptions {
  return {
    checkValues: false,
    cwd: process.cwd(),
    allowDuplicates: false,
    fix: false,
    json: false,
    ignore: [],
    ignoreRegex: [],
    only: [],
    showStats: false,
    strict: false,
    uppercaseKeys: false,
    suggest: true,
    ...overrides,
  };
}
