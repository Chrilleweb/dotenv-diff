import path from 'path';

/**
 * Resolves a filesystem path relative to a given current working directory (CWD).
 *
 * This helper is used to ensure consistent path resolution when working with
 * user-provided paths.
 *
 * Behavior:
 * - If `p` is an absolute path, it is returned unchanged.
 * - If `p` is a relative path, it is resolved against the provided `cwd`
 *   using Node.js `path.resolve`.
 *
 * Notes:
 * - This function does not validate `cwd` or `p`.
 * - Any path normalization follows the behavior of `path.resolve`.
 *
 * @param cwd - The base directory used to resolve relative paths
 * @param p - A relative or absolute filesystem path
 * @returns An absolute filesystem path
 *
 * @example
 * resolveFromCwd("/home/user/project", "config/.env")
 * // → "/home/user/project/config/.env"
 *
 * @example
 * resolveFromCwd("/home/user/project", "/etc/hosts")
 * // → "/etc/hosts"
 */

export const resolveFromCwd = (cwd: string, p: string): string =>
  path.isAbsolute(p) ? p : path.resolve(cwd, p);
