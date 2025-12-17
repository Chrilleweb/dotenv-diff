import path from 'path';

/**
 * Resolves a path relative to the current working directory.
 * @param cwd - Current working directory
 * @param p - Path to resolve
 * @returns Resolved absolute path
 */
export const resolveFromCwd = (cwd: string, p: string): string =>
  path.isAbsolute(p) ? p : path.resolve(cwd, p);

