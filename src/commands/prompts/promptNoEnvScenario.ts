import fs from 'fs';
import path from 'path';
import { confirmYesNo } from '../../ui/prompts.js';
import { DEFAULT_ENV_FILE } from '../../config/constants.js';
import type { ScanUsageOptions, ComparisonFile } from '../../config/types.js';

/**
 * Prompts the user to create a .env file if none are found in scan usage
 * @param opts - Scan configuration options
 * @returns The path and name of the created .env file, or undefined if none created
 */
export async function promptNoEnvScenario(
  opts: ScanUsageOptions,
): Promise<{ compareFile: ComparisonFile | undefined }> {
  if (opts.isCiMode) {
    return { compareFile: undefined };
  }
  console.log();
  const shouldCreate = opts.isYesMode
    ? true
    : await confirmYesNo(
        "You don't have any .env files. Do you want to create a .env?",
        {
          isCiMode: opts.isCiMode ?? false,
          isYesMode: opts.isYesMode ?? false,
        },
      );

  if (!shouldCreate) {
    return { compareFile: undefined };
  }

  const envPath = path.resolve(opts.cwd, DEFAULT_ENV_FILE);

  fs.writeFileSync(envPath, '');

  return {
    compareFile: {
      path: envPath,
      name: DEFAULT_ENV_FILE,
    },
  };
}
