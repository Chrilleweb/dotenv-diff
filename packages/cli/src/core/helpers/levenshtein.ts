/**
 * Computes the Levenshtein edit distance between two strings.
 *
 * The edit distance is the minimum number of single-character insertions,
 * deletions, or substitutions required to turn `a` into `b`.
 *
 * Uses a two-row dynamic programming approach, so memory usage is O(min(a, b))
 * rather than O(a * b).
 *
 * @param a - The first string
 * @param b - The second string
 * @returns The Levenshtein distance between the two strings
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure `b` is the shorter string to keep the row buffers small.
  if (b.length > a.length) {
    [a, b] = [b, a];
  }

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currentRow = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    currentRow[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        currentRow[j - 1]! + 1, // insertion
        previousRow[j]! + 1, // deletion
        previousRow[j - 1]! + cost, // substitution
      );
    }

    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[b.length]!;
}
