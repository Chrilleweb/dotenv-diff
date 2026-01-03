import fs from 'fs';
import path from 'path';
import type { RawOptions } from './types.js';
import {
  printConfigLoaded,
  printConfigLoadError,
} from '../ui/shared/printConfigStatus.js';

/**
 * Loads dotenv-diff.config.json (if present)
 * Searches upward for config
 * and merges it with CLI flags.
 * CLI options always take precedence.
 * @param cliOptions - Options provided via CLI
 * @return Merged options
 */
export function loadConfig(cliOptions: Partial<RawOptions>): RawOptions {
  const cwd = process.cwd();

  // Recursive search upwards for dotenv-diff.config.json
  function findConfigFile(dir: string): string | null {
    const configPath = path.resolve(dir, 'dotenv-diff.config.json');
    if (fs.existsSync(configPath)) return configPath;

    const parent = path.dirname(dir);
    if (parent !== dir) return findConfigFile(parent);
    return null;
  }

  const foundPath = findConfigFile(cwd);

  let fileConfig: Partial<RawOptions> = {};

  if (foundPath) {
    try {
      const raw = fs.readFileSync(foundPath, 'utf8');
      fileConfig = JSON.parse(raw) satisfies Partial<RawOptions>;
      if (!cliOptions.json) {
        printConfigLoaded(foundPath);
      }
    } catch (err) {
      if (!cliOptions.json) {
        printConfigLoadError(err);
      }
    }
  }

  // Merge: config file first, then CLI options override
  return {
    ...fileConfig,
    ...cliOptions,
  };
}
