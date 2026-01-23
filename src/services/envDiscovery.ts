import fs from 'fs';
import path from 'path';
import type { Discovery } from '../config/types.js';
import { DEFAULT_ENV_FILE, DEFAULT_EXAMPLE_FILE } from '../config/constants.js';

/**
 * Arguments for the discoverEnvFiles function.
 */
interface DiscoverEnvFilesArgs {
  cwd: string;
  envFlag: string | null;
  exampleFlag: string | null;
}

/**
 * Discovers environment files in the specified directory.
 * @param cwd - The current working directory.
 * @param envFlag - The --env flag value if provided.
 * @param exampleFlag - The --example flag value if provided.
 * @returns A Discovery object containing the found environment files and their metadata.
 */
export function discoverEnvFiles({
  cwd,
  envFlag,
  exampleFlag,
}: DiscoverEnvFilesArgs): Discovery {
  // Find all .env* files in the current directory except .env.example*
  const envFiles = fs
    .readdirSync(cwd)
    .filter(
      (f) =>
        f.startsWith(DEFAULT_ENV_FILE) && !f.startsWith(DEFAULT_EXAMPLE_FILE),
    )
    .sort((a, b) =>
      a === DEFAULT_ENV_FILE
        ? -1
        : b === DEFAULT_ENV_FILE
          ? 1
          : a.localeCompare(b),
    );

  let primaryEnv = envFiles.includes(DEFAULT_ENV_FILE)
    ? DEFAULT_ENV_FILE
    : envFiles[0] || DEFAULT_ENV_FILE;
  let primaryExample = DEFAULT_EXAMPLE_FILE;
  let alreadyWarnedMissingEnv = false;

  // --env (without --example): force primaryEnv and try to find a matching example name via suffix
  if (envFlag && !exampleFlag) {
    const envNameFromFlag = path.basename(envFlag);
    primaryEnv = envNameFromFlag;

    // If the specified --env actually exists, make sure it's in the list (first) without duplicates
    if (fs.existsSync(envFlag)) {
      const set = new Set([envNameFromFlag, ...envFiles]);
      envFiles.length = 0;
      envFiles.push(...Array.from(set));
    }

    // try to find a matching example name based on the suffix
    const suffix =
      envNameFromFlag === DEFAULT_ENV_FILE
        ? ''
        : envNameFromFlag.replace(DEFAULT_ENV_FILE, '');
    const potentialExample = suffix
      ? `${DEFAULT_EXAMPLE_FILE}${suffix}`
      : DEFAULT_EXAMPLE_FILE;
    if (fs.existsSync(path.resolve(cwd, potentialExample))) {
      primaryExample = potentialExample;
    }
  }

  // --example (without --env): force primaryExample and try to find a matching env name via suffix
  if (exampleFlag && !envFlag) {
    const exampleNameFromFlag = path.basename(exampleFlag);
    primaryExample = exampleNameFromFlag;

    if (exampleNameFromFlag.startsWith(DEFAULT_EXAMPLE_FILE)) {
      const suffix = exampleNameFromFlag.slice(DEFAULT_EXAMPLE_FILE.length);
      const matchedEnv = suffix
        ? `${DEFAULT_ENV_FILE}${suffix}`
        : DEFAULT_ENV_FILE;

      if (fs.existsSync(path.resolve(cwd, matchedEnv))) {
        primaryEnv = matchedEnv;
        envFiles.length = 0;
        envFiles.push(matchedEnv);
      } else {
        // Only set alreadyWarnedMissingEnv if there are NO env files at all
        // If we have other env files (like .env.local), we should still prompt
        if (envFiles.length === 0) {
          alreadyWarnedMissingEnv = true;
        } else {
          // Use the first available env file instead
          primaryEnv = envFiles[0] || DEFAULT_ENV_FILE;
        }
      }
    } else {
      //  If the example file is not a standard .env.example, we just use it as is
      if (envFiles.length === 0) envFiles.push(primaryEnv);
    }
  }

  return {
    cwd,
    envFiles,
    primaryEnv,
    primaryExample,
    envFlag,
    exampleFlag,
    alreadyWarnedMissingEnv,
  };
}
