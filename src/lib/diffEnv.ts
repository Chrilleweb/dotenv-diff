export type DiffResult = {
  missing: string[];
  extra: string[];
};

export function diffEnv(
  current: Record<string, string>,
  example: Record<string, string>
): DiffResult {
  const currentKeys = Object.keys(current);
  const exampleKeys = Object.keys(example);

  const missing = exampleKeys.filter((key) => !currentKeys.includes(key));
  const extra = currentKeys.filter((key) => !exampleKeys.includes(key));

  return { missing, extra };
}
