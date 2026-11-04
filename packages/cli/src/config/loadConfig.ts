import fs from 'fs';
import type { InvalidConfigValue, RawOptions } from './types.js';
import { findConfigFile } from '../core/helpers/findConfigFile.js';
import { suggestTypos } from '../core/suggestTypos.js';
import {
  printConfigLoaded,
  printConfigLoadError,
  printConfigUnknownKeys,
  printConfigInvalidValues,
} from '../ui/shared/printConfigStatus.js';

/** The JSON value shape a config key accepts, mirroring {@link RawOptions}. */
type ConfigValueKind =
  'boolean' | 'string' | 'stringList' | 'booleanOrStringArray';

/** Human readable description of each value kind, used in warnings. */
const KIND_DESCRIPTIONS: Record<ConfigValueKind, string> = {
  boolean: 'boolean',
  string: 'string',
  stringList: 'string or string[]',
  booleanOrStringArray: 'boolean or string[]',
};

/**
 * Keys accepted in dotenv-diff.config.json and the value kind each expects.
 * Typed as a Record so the compiler fails if this drifts from {@link RawOptions}.
 */
const KNOWN_CONFIG_KEYS: Record<keyof RawOptions, ConfigValueKind> = {
  baseline: 'boolean',
  checkValues: 'boolean',
  ci: 'boolean',
  yes: 'boolean',
  allowDuplicates: 'boolean',
  fix: 'boolean',
  json: 'boolean',
  env: 'string',
  example: 'string',
  ignore: 'stringList',
  ignoreRegex: 'stringList',
  only: 'stringList',
  compare: 'boolean',
  color: 'boolean',
  noColor: 'boolean',
  scanUsage: 'boolean',
  includeFiles: 'stringList',
  excludeFiles: 'stringList',
  showUnused: 'boolean',
  showStats: 'boolean',
  files: 'stringList',
  secrets: 'boolean',
  strict: 'boolean',
  ignoreUrls: 'stringList',
  init: 'boolean',
  uppercaseKeys: 'boolean',
  expireWarnings: 'boolean',
  inconsistentNamingWarnings: 'boolean',
  commentWarnings: 'boolean',
  driftWarnings: 'boolean',
  listAll: 'boolean',
  explain: 'string',
  matrix: 'booleanOrStringArray',
  suggest: 'boolean',
};

/**
 * Loads dotenv-diff.config.json (if present)
 * Searches upward for config
 * and merges it with CLI flags.
 * CLI options always take precedence.
 * Unknown keys and values of the wrong type are reported and dropped.
 * A config file that cannot be parsed
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
      fileConfig = pickValidValues(pickKnownKeys(parseConfigObject(raw)));
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

/**
 * Drops values whose type does not match what the key accepts and warns about
 * them, so e.g. `"strict": "yes"` is reported instead of silently becoming false.
 * @param config - The config with only known keys
 * @returns The config with only correctly typed values
 */
function pickValidValues(config: Partial<RawOptions>): Partial<RawOptions> {
  const invalid: InvalidConfigValue[] = [];

  for (const [key, val] of Object.entries(config)) {
    const kind = KNOWN_CONFIG_KEYS[key as keyof RawOptions];
    if (!matchesKind(val, kind)) {
      invalid.push({
        key,
        expected: KIND_DESCRIPTIONS[kind],
        received: describeValue(val),
      });
    }
  }

  if (invalid.length === 0) return config;

  printConfigInvalidValues(invalid);

  const invalidKeys = new Set(invalid.map((i) => i.key));
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => !invalidKeys.has(key)),
  ) as Partial<RawOptions>;
}

/**
 * Checks whether a config value has the shape a key accepts.
 * @param val - The config value
 * @param kind - The value kind the key accepts
 * @returns True if the value matches the kind
 */
function matchesKind(val: unknown, kind: ConfigValueKind): boolean {
  const isStringArray =
    Array.isArray(val) && val.every((v) => typeof v === 'string');

  switch (kind) {
    case 'boolean':
      return typeof val === 'boolean';
    case 'string':
      return typeof val === 'string';
    case 'stringList':
      return typeof val === 'string' || isStringArray;
    case 'booleanOrStringArray':
      return typeof val === 'boolean' || isStringArray;
  }
}

/**
 * Describes the JSON type of a value for warning messages.
 * @param val - The config value
 * @returns The JSON type name, e.g. "string", "number[]" or "null"
 */
function describeValue(val: unknown): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) {
    const itemTypes = [...new Set(val.map(describeValue))];
    return itemTypes.length === 1 ? `${itemTypes[0]}[]` : 'array';
  }
  return typeof val;
}
