import fs from 'fs';
import path from 'path';
import { confirmYesNo } from '../ui/prompts.js';
import { warnIfEnvNotIgnored } from '../services/git.js';
import { printPrompt } from '../ui/compare/printPrompt.js';
import { DEFAULT_ENV_FILE } from '../config/constants.js';

/**
 * Result of ensureFilesOrPrompt function
 */
interface EnsureFilesResult {
  didCreate: boolean;
  shouldExit: boolean;
  exitCode: number;
}

/**
 * Arguments for ensureFilesOrPrompt function
 */
interface EnsureFilesArgs {
  cwd: string;
  primaryEnv: string;
  primaryExample: string;
  alreadyWarnedMissingEnv: boolean;
  isYesMode: boolean;
  isCiMode: boolean;
}
/**
 * Ensures that the necessary .env files exist or prompts the user to create them.
 * This function handles only scenarios where the --compare flag is set
 * @param args - The arguments for the function.
 * @returns An object indicating whether a file was created or if the process should exit.
 */
export async function ensureFilesOrPrompt(
  args: EnsureFilesArgs,
): Promise<EnsureFilesResult> {
  const { cwd, primaryEnv, primaryExample, isYesMode, isCiMode } = args;

  const envPath = path.resolve(cwd, primaryEnv);
  const examplePath = path.resolve(cwd, primaryExample);
  const envExists = fs.existsSync(envPath);
  const exampleExists = fs.existsSync(examplePath);

  // Case 1: no .env and no .env.example
  if (!envExists && !exampleExists) {
    const hasAnyEnv = fs
      .readdirSync(cwd)
      .some((f) => f.startsWith(DEFAULT_ENV_FILE));
    if (!hasAnyEnv) {
      printPrompt.noEnvFound();
      return { didCreate: false, shouldExit: true, exitCode: 0 };
    }
  }

  // Case 2: missing .env but has .env.example
  if (!envExists && exampleExists) {
    if (args.alreadyWarnedMissingEnv) {
      return { didCreate: false, shouldExit: true, exitCode: 0 };
    }
    printPrompt.missingEnv(envPath);
    const createEnv = isYesMode
      ? true
      : isCiMode
        ? false
        : await confirmYesNo(
            `Do you want to create a ${path.basename(envPath)} file from ${path.basename(examplePath)}?`,
            { isCiMode, isYesMode },
          );

    if (!createEnv) {
      printPrompt.skipCreation(DEFAULT_ENV_FILE);
      return { didCreate: false, shouldExit: true, exitCode: 0 };
    }

    const exampleContent = fs.readFileSync(examplePath, 'utf-8');
    fs.writeFileSync(envPath, exampleContent);
    printPrompt.envCreated(envPath, examplePath);

    warnIfEnvNotIgnored({ envFile: path.basename(envPath) });
  }

  // Case 3: has .env but is missing .env.example
  if (envExists && !exampleExists) {
    if (args.alreadyWarnedMissingEnv) {
      return { didCreate: false, shouldExit: true, exitCode: 0 };
    }
    printPrompt.missingEnv(examplePath);
    const createExample = isYesMode
      ? true
      : isCiMode
        ? false
        : await confirmYesNo(
            `Do you want to create a ${path.basename(examplePath)} file from ${path.basename(envPath)}?`,
            { isCiMode, isYesMode },
          );

    if (!createExample) {
      printPrompt.skipCreation('.env.example');
      return { didCreate: false, shouldExit: true, exitCode: 0 };
    }

    const envContent = fs
      .readFileSync(envPath, 'utf-8')
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return trimmed;
        const [key] = trimmed.split('=');
        return `${key}=`;
      })
      .join('\n');

    fs.writeFileSync(examplePath, envContent);
    printPrompt.exampleCreated(examplePath, envPath);
  }

  return { didCreate: true, shouldExit: false, exitCode: 0 };
}
