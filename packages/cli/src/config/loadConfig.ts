import fs from 'fs';
import type { RawOptions } from './types.js';
import { findConfigFile } from '../core/helpers/findConfigFile.js';
import { suggestTypos } from '../core/suggestTypos.js';
import {
  printConfigLoaded,
  printConfigLoadError,
  printConfigUnknownKeys,
} from '../ui/shared/printConfigStatus.js';

/**
 * Keys accepted in dotenv-diff.config.json.
 * Typed as a Record so the compiler fails if this drifts from {@link RawOptions}.
 */
const KNOWN_CONFIG_KEYS: Record<keyof RawOptions, true> = {
  baseline: true,
  checkValues: true,
  ci: true,
  yes: true,
  allowDuplicates: true,
  fix: true,
  json: true,
  env: true,
  example: true,
  ignore: true,
  ignoreRegex: true,
  only: true,
  compare: true,
  color: true,
  noColor: true,
  scanUsage: true,
  includeFiles: true,
  excludeFiles: true,
  showUnused: true,
  showStats: true,
  files: true,
  secrets: true,
  strict: true,
  ignoreUrls: true,
  init: true,
  uppercaseKeys: true,
  expireWarnings: true,
  inconsistentNamingWarnings: true,
  commentWarnings: true,
  driftWarnings: true,
  listAll: true,
  explain: true,
  matrix: true,
  suggest: true,
};

/**
 * Loads dotenv-diff.config.json (if present)
 * Searches upward for config
 * and merges it with CLI flags.
 * CLI options always take precedence.
 * Unknown keys are reported and dropped. A config file that cannot be parsed
 * is reported and ignored, or exits with code 1 in --ci mode.
 * @param cliOptions - Options provided via CLI
 * @return Merged options
 */
export function loadConfig(cliOptions: Partial<RawOptions>): RawOptions {
  const cwd = process.cwd();

  const foundPath = findConfigFile(cwd, 'dotenv-diff.config.json');

  let fileConfig: Partial<RawOptions> = {};

  if (foundPath) {
    try {
      const raw = fs.readFileSync(foundPath, 'utf8');
      fileConfig = pickKnownKeys(parseConfigObject(raw));
      if (!(cliOptions.json ?? fileConfig.json)) {
        printConfigLoaded(foundPath);
      }
    } catch (err) {
      printConfigLoadError(err);
      // Running with a silently ignored config in CI could hide real issues
      if (cliOptions.ci) {
        process.exit(1);
      }
    }
  }

  // Merge: config file first, then CLI options override
  return {
    ...fileConfig,
    ...cliOptions,
  };
}

/**
 * Parses the config file content and ensures it is a JSON object.
 * @param raw - The raw config file content
 * @returns The parsed config object
 */
function parseConfigObject(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Config must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

/**
 * Drops keys that are not valid config options and warns about them,
 * suggesting the closest known key for likely typos.
 * @param config - The parsed config object
 * @returns The config with only known keys
 */
function pickKnownKeys(config: Record<string, unknown>): Partial<RawOptions> {
  const unknownKeys = Object.keys(config).filter(
    (key) => !Object.hasOwn(KNOWN_CONFIG_KEYS, key),
  );

  if (unknownKeys.length === 0) return config as Partial<RawOptions>;

  printConfigUnknownKeys(
    unknownKeys,
    suggestTypos(unknownKeys, Object.keys(KNOWN_CONFIG_KEYS)),
  );

  return Object.fromEntries(
    Object.entries(config).filter(([key]) => !unknownKeys.includes(key)),
  ) as Partial<RawOptions>;
}
