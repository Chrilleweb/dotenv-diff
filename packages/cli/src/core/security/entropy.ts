/**
 * Calculates the normalized Shannon entropy of a string.
 * Shannon entropy is a measure of the unpredictability or randomness of a string.
 * @param s - The input string.
 * @returns The normalized Shannon entropy (between 0 and 1).
 */
export function shannonEntropyNormalized(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  // Count code points (matching the `for..of` iteration above) rather than
  // UTF-16 code units, so the frequencies `p = c / len` always sum to 1 —
  // otherwise strings with astral characters (surrogate pairs) are scored wrong.
  const len = [...s].length;
  let H = 0;
  for (const [, c] of freq) {
    const p = c / len;
    H += -p * Math.log2(p);
  }
  // Normalize by the maximum possible entropy for the character set (assuming 72 possible characters)
  const maxH = Math.log2(72);
  return Math.min(1, H / maxH);
}
