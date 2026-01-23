import { parseEnvFile } from '../parseEnv.js';
import { filterIgnoredKeys } from '../filterIgnoredKeys.js';
import type { ComparisonOptions } from '../../config/types.js';

/**
 * Result of parsing and filtering environment files
 */
interface ParsedAndFilteredEnv {
  current: Record<string, string>;
  example: Record<string, string>;
  currentKeys: string[];
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
      currentKeys.map((k) => [k, currentFull[k] ?? '']),
    ),
    example: Object.fromEntries(
      exampleKeys.map((k) => [k, exampleFull[k] ?? '']),
    ),
    currentKeys,
    exampleKeys,
  };
}
