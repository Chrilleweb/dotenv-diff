/**
 * Compares two strings by UTF-16 code point order.
 *
 * Unlike {@link String.prototype.localeCompare}, this is fully deterministic
 * across operating systems and locales. `localeCompare` relies on the host's
 * ICU/collation data, which can order strings differently between platforms
 * (e.g. on Windows it may sort ".env.zzz" before ".env.aaa"), making CLI
 * output non-deterministic. Use this for any ordering the user can observe.
 *
 * @param a - The first string.
 * @param b - The second string.
 * @returns -1 if a < b, 1 if a > b, 0 if equal.
 */
export function compareCodePoint(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
