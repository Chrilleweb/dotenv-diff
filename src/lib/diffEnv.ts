export type DiffResult = {
  missing: string[];
  extra: string[];
  valueMismatches: {
    key: string;
    expected: string;
    actual: string;
  }[];
};

export function diffEnv(
  current: Record<string, string>,
  example: Record<string, string>
): DiffResult {
  const currentKeys = Object.keys(current);
  const exampleKeys = Object.keys(example);

  const missing = exampleKeys.filter((key) => !currentKeys.includes(key));
  const extra = currentKeys.filter((key) => !exampleKeys.includes(key));

  const valueMismatches = exampleKeys
    .filter((key) => currentKeys.includes(key))
    .filter((key) => current[key] !== example[key]) // her kan du evt. bruge .toLowerCase() hvis det skal være case-insensitive
    .map((key) => ({
      key,
      expected: example[key],
      actual: current[key],
    }));

  return { missing, extra, valueMismatches };
}
