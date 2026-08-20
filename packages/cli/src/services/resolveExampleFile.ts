import fs from 'fs';
import path from 'path';
import { getSuffix } from './envDiscovery.js';
import { isExampleFile } from '../core/helpers/isExampleFile.js';
import {
  DEFAULT_ENV_FILE,
  EXAMPLE_FILE_CANDIDATES,
} from '../config/constants.js';

/**
 * Finds the example file that documents a given env file.
 *
 * An environment-suffixed env file prefers the matching suffixed example
 * (`.env.production` → `.env.example.production`), mirroring how `--compare`
 * pairs files, and falls back to the unsuffixed names. Within each group the
 * {@link EXAMPLE_FILE_CANDIDATES} order decides, so `.env.example` wins over
 * `.env.sample` when a project has both.
 *
 * A file that is itself an example documents itself: passing `.env.example`
 * returns it unchanged. That keeps callers from having to special-case the scan
 * falling through to the example file when no `.env` exists.
 * @param filePath - Absolute path of the env file to find documentation for.
 * @returns Absolute path of the example file, or null when none exists.
 */
export function resolveExampleFile(filePath: string): string | null {
  const fileName = path.basename(filePath);

  if (isExampleFile(fileName, { withSuffix: true })) {
    return fs.existsSync(filePath) ? filePath : null;
  }

  const dir = path.dirname(filePath);
  const suffix = getSuffix(fileName, DEFAULT_ENV_FILE);

  const names = suffix
    ? [
        ...EXAMPLE_FILE_CANDIDATES.map((name) => `${name}${suffix}`),
        ...EXAMPLE_FILE_CANDIDATES,
      ]
    : EXAMPLE_FILE_CANDIDATES;

  return (
    names.map((name) => path.join(dir, name)).find((p) => fs.existsSync(p)) ??
    null
  );
}
