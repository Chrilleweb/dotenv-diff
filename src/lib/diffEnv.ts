export type DiffResult = {
  missing: string[];
  extra: string[];
  valueMismatches: {
    key: string;
    expected: string;
    actual: string;
  }[];
};

/**
 * Compares two .env files and returns their differences.
 *
 * @param current - An object representing the current `.env` file (key-value pairs).
 * @param example - An object representing the `.env.example` file (key-value pairs).
 * @param checkValues - If true, compare values when the example has a non-empty value.
 * @returns A `DiffResult` object containing missing, extra, and mismatched keys.
 */
export function diffEnv(
  current: Record<string, string>,
  example: Record<string, string>,
  checkValues = false,
): DiffResult {
  const currentKeys = Object.keys(current);
  const exampleKeys = Object.keys(example);

  const missing = exampleKeys.filter((key) => !currentKeys.includes(key));
  const extra = currentKeys.filter((key) => !exampleKeys.includes(key));

  let valueMismatches: DiffResult['valueMismatches'] = [];

  if (checkValues) {
    valueMismatches = exampleKeys
      .filter((key) => {
        return (
          currentKeys.includes(key) &&
          example[key].trim() !== '' &&
          current[key] !== example[key]
        );
      })
      .map((key) => ({
        key,
        expected: example[key],
        actual: current[key],
      }));
  }

  return { missing, extra, valueMismatches };
}
