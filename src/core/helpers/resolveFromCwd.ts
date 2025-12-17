import path from 'path';

/**
 * Resolves a filesystem path relative to a given current working directory (CWD).
 *
 * This helper is useful when working with user-provided paths that may be
 * relative or absolute.
 *
 * - Absolute paths are returned unchanged.
 * - Relative paths are resolved against `cwd` using `path.resolve`.
 *
 * @param cwd - Base directory used to resolve relative paths
 * @param p - A relative or absolute filesystem path
 * @returns An absolute filesystem path
 */
export const resolveFromCwd = (cwd: string, p: string): string =>
  path.isAbsolute(p) ? p : path.resolve(cwd, p);
