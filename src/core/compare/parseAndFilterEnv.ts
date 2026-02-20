import { parseEnvFile } from '../parseEnv.js';
import { filterIgnoredKeys } from '../filterIgnoredKeys.js';
import type { ComparisonOptions } from '../../config/types.js';

/**
 * Result of parsing and filtering environment files
 */
interface ParsedAndFilteredEnv {
  /** Parsed and filtered current environment variables */
  current: Record<string, string>;
  /** Parsed and filtered example environment variables */
  example: Record<string, string>;
  /** Keys of the parsed and filtered current environment variables */
  currentKeys: string[];
  /** Keys of the parsed and filtered example environment variables */
  exampleKeys: string[];
}

/**
 * Parses and filters the environment and example files.
 * @param envPath The path to the .env file
 * @param examplePath The path to the .env.example file
 * @param opts Comparison options
 * @returns An object containing the parsed and filtered environment variables
 */
export function parseAndFilterEnv(
  envPath: string,
  examplePath: string,
  opts: ComparisonOptions,
): ParsedAndFilteredEnv {
  const currentFull = parseEnvFile(envPath);
  const exampleFull = parseEnvFile(examplePath);

  const currentKeys = filterIgnoredKeys(
    Object.keys(currentFull),
    opts.ignore,
    opts.ignoreRegex,
  );

  const exampleKeys = filterIgnoredKeys(
    Object.keys(exampleFull),
    opts.ignore,
    opts.ignoreRegex,
  );

  return {
    current: Object.fromEntries(
      currentKeys.map((k) => [k, currentFull[k]!]),
    ),
    example: Object.fromEntries(
      exampleKeys.map((k) => [k, exampleFull[k]!]),
    ),
    currentKeys,
    exampleKeys,
  };
}
