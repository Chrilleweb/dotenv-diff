import type {
  MatrixFileInput,
  MatrixResult,
  MatrixRow,
} from '../config/types.js';

/**
 * Compares 2+ env files as a key-presence matrix: every unique key across
 * all files becomes a row, and every file becomes a column.
 *
 * Unlike `diffEnv`, there is no "reference" file here - every file is an
 * equal column, which makes this suitable for comparing N environments
 * (e.g. .env.production vs .env.staging vs .env.example) at once.
 *
 * @param files - The files to compare, each with its parsed key-value pairs.
 * @param checkValues - If true, also flags keys whose value differs across the files that define them.
 * @returns A `MatrixResult` containing one row per unique key and whether everything matches.
 */
export function diffMatrix(
  files: MatrixFileInput[],
  checkValues: boolean = false,
): MatrixResult {
  const keySet = new Set<string>();
  for (const file of files) {
    for (const key of Object.keys(file.values)) keySet.add(key);
  }

  const rows: MatrixRow[] = Array.from(keySet)
    .sort()
    .map((key) => buildRow(key, files, checkValues));

  const allMatch = rows.every(
    (row) => row.presence.every(Boolean) && !row.hasMismatch,
  );

  return { files: files.map((f) => f.name), rows, allMatch };
}

/**
 * Builds a single matrix row for one key across all files.
 * @param key - The environment variable key.
 * @param files - The files to compare.
 * @param checkValues - Whether to detect value mismatches for this key.
 * @returns The row describing presence/values/mismatch for this key.
 */
function buildRow(
  key: string,
  files: MatrixFileInput[],
  checkValues: boolean,
): MatrixRow {
  const presence = files.map((f) => Object.hasOwn(f.values, key));
  const values = files.map((f, i) => (presence[i] ? f.values[key] : undefined));

  const hasMismatch =
    checkValues && new Set(values.filter((_, i) => presence[i])).size > 1;

  return { key, presence, values, hasMismatch };
}
