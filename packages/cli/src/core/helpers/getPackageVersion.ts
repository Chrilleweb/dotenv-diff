import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findConfigFile } from './findConfigFile.js';

/**
 * Reads the version from this package's package.json.
 * Searched for upward because its relative location differs between the
 * source tree (src/) and the build output (dist/src/).
 * @returns The package version, or 'unknown' if package.json cannot be read
 */
export function getPackageVersion(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = findConfigFile(here, 'package.json');
    if (!pkgPath) return 'unknown';
    const pkg: unknown = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const version = (pkg as { version?: unknown }).version;
    return typeof version === 'string' ? version : 'unknown';
  } catch {
    return 'unknown';
  }
}
