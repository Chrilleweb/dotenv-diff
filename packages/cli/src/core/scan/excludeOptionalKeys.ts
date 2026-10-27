import type { ScanResult } from '../../config/types.js';

/**
 * Removes keys marked `@optional` from the missing keys of a scan result.
 *
 * An optional key may be left out of the env file entirely — that is what the
 * annotation means — so it must not be reported as missing. The typo
 * suggestions derived from those keys go too.
 * @param scanResult - The result of the scan.
 * @param optionalKeys - Keys marked `@optional` in the example file.
 * @returns The scan result without the optional keys.
 */
export function excludeOptionalKeys(
  scanResult: ScanResult,
  optionalKeys: ReadonlySet<string>,
): ScanResult {
  if (optionalKeys.size === 0) return scanResult;

  const isRequired = (key: string) => !optionalKeys.has(key);

  return {
    ...scanResult,
    missing: scanResult.missing.filter(isRequired),
    ...(scanResult.suggestions
      ? {
          suggestions: scanResult.suggestions.filter((s) => isRequired(s.key)),
        }
      : {}),
  };
}
