import fs from 'fs';
import path from 'path';
import type { Discovery } from '../config/types.js';

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
    .filter((f) => f.startsWith('.env') && !f.startsWith('.env.example'))
    .sort((a, b) =>
      a === '.env' ? -1 : b === '.env' ? 1 : a.localeCompare(b),
    );

  let primaryEnv = envFiles.includes('.env') ? '.env' : envFiles[0] || '.env';
  let primaryExample = '.env.example';
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
      envNameFromFlag === '.env' ? '' : envNameFromFlag.replace('.env', '');
    const potentialExample = suffix ? `.env.example${suffix}` : '.env.example';
    if (fs.existsSync(path.resolve(cwd, potentialExample))) {
      primaryExample = potentialExample;
    }
  }

  // --example (without --env): force primaryExample and try to find a matching env name via suffix
  if (exampleFlag && !envFlag) {
    const exampleNameFromFlag = path.basename(exampleFlag);
    primaryExample = exampleNameFromFlag;

    if (exampleNameFromFlag.startsWith('.env.example')) {
      const suffix = exampleNameFromFlag.slice('.env.example'.length);
      const matchedEnv = suffix ? `.env${suffix}` : '.env';

      if (fs.existsSync(path.resolve(cwd, matchedEnv))) {
        primaryEnv = matchedEnv;
        envFiles.length = 0;
        envFiles.push(matchedEnv);
      } else {
        alreadyWarnedMissingEnv = true;
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
