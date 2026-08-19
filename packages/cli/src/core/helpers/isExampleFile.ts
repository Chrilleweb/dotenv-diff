import { EXAMPLE_FILE_CANDIDATES } from '../../config/constants.js';

/**
 * Options for {@link isExampleFile}.
 */
interface IsExampleFileOptions {
  /**
   * Also accept environment-suffixed variants (`.env.example.production`).
   * Off by default, so only the bare documentation files match.
   */
  withSuffix?: boolean;
}

/**
 * Reports whether a filename is an example/template file — one that documents
 * which keys are required rather than holding real values.
 * @param fileName - A file basename (e.g. `.env.sample`), matched case-insensitively.
 * @param options - Whether environment-suffixed variants count.
 * @returns True when the name is an example file.
 */
export function isExampleFile(
  fileName: string,
  { withSuffix = false }: IsExampleFileOptions = {},
): boolean {
  const lower = fileName.toLowerCase();

  return EXAMPLE_FILE_CANDIDATES.some(
    (candidate) =>
      lower === candidate || (withSuffix && lower.startsWith(`${candidate}.`)),
  );
}
