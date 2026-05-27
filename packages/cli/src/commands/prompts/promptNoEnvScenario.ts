import fs from 'fs';
import path from 'path';
import { confirmYesNo } from './prompts.js';
import { DEFAULT_ENV_FILE } from '../../config/constants.js';
import type { ScanUsageOptions, ComparisonFile } from '../../config/types.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';

/**
 * Prompts the user to create a comparison file if none are found in scan usage
 * @param opts - Scan configuration options
 * @returns The path and name of the created file, or undefined if none created
 */
export async function promptNoEnvScenario(
  opts: ScanUsageOptions,
): Promise<{ compareFile: ComparisonFile | undefined }> {
  if (opts.isCiMode) {
    return { compareFile: undefined };
  }

  console.log();

  // Determine target file name for prompt based on provided options or default
  const targetFile = opts.examplePath ?? opts.envPath ?? DEFAULT_ENV_FILE;
  const fileName = path.basename(normalizePath(targetFile));

  const shouldCreate = opts.isYesMode
    ? true
    : await confirmYesNo(
        `You don't have any .env files. Do you want to create a ${fileName}?`,
        {
          isCiMode: opts.isCiMode ?? false,
          isYesMode: opts.isYesMode ?? false,
        },
      );

  if (!shouldCreate) {
    return { compareFile: undefined };
  }

  const filePath = path.resolve(opts.cwd, fileName);

  fs.writeFileSync(filePath, '');

  return {
    compareFile: {
      path: filePath,
      name: fileName,
    },
  };
}
