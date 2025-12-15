import fs from 'fs';
import path from 'path';
import type { Discovery } from '../services/envDiscovery.js';
import type { FilePair } from '../config/types.js';

/**
 * Pairs each environment file with its corresponding example file.
 * @param d - The discovery object containing environment and example file information.
 * @returns An array of objects containing the environment name, path, and example path.
 */
export function pairWithExample(d: Discovery): Array<FilePair> {
  const pairs: Array<FilePair> = [];
  const list = d.envFiles.length > 0 ? d.envFiles : [d.primaryEnv];

  for (const envName of list) {
    if (d.exampleFlag && !d.envFlag) {
      const envAbs = path.resolve(d.cwd, envName);
      if (envAbs === path.resolve(d.cwd, d.primaryExample)) continue;
    }

    const suffix = envName === '.env' ? '' : envName.replace('.env', '');
    const exampleName = suffix ? `.env.example${suffix}` : d.primaryExample;

    const envPathCurrent = path.resolve(d.cwd, envName);
    const examplePathCurrent =
      d.exampleFlag && !d.envFlag
        ? path.resolve(d.cwd, d.primaryExample)
        : fs.existsSync(path.resolve(d.cwd, exampleName))
          ? path.resolve(d.cwd, exampleName)
          : path.resolve(d.cwd, d.primaryExample);

    pairs.push({
      envName,
      envPath: envPathCurrent,
      examplePath: examplePathCurrent,
    });
  }

  return pairs;
}
