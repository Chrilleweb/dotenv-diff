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
  const len = s.length;
  let H = 0;
  for (const [, c] of freq) {
    const p = c / len;
    H += -p * Math.log2(p);
  }
  // Antag alfabet ~72 tegn (A-Za-z0-9+/_- mv.)
  const maxH = Math.log2(72);
  return Math.min(1, H / maxH);
}
