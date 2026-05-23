import fs from 'fs';
import path from 'path';
/**
 * Recursive search upwards for a config file with the given name, starting from the specified directory.
 * fx: dotenv-diff.config.json or dotenv-diff.baseline.json
 * @param dir - Directory to start searching from
 * @param file - The name of the config file to search for
 * @returns The path to the config file if found, otherwise null
 */
export function findConfigFile(dir: string, file: string): string | null {
  const configPath = path.resolve(dir, file);
  if (fs.existsSync(configPath)) return configPath;

  const parent = path.dirname(dir);
  if (parent !== dir) return findConfigFile(parent, file);
  return null;
}
