export function filterIgnoredKeys(
  keys: string[],
  ignore: string[],
  ignoreRegex: RegExp[],
): string[] {
  return keys.filter(
    (k) => !ignore.includes(k) && !ignoreRegex.some((rx) => rx.test(k)),
  );
}
