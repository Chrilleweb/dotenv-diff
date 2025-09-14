import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { confirmYesNo } from '../ui/prompts.js';
import { warnIfEnvNotIgnored } from '../services/git.js';

/**
 * Ensures that the necessary .env files exist or prompts the user to create them.
 * @param args - The arguments for the function.
 * @returns An object indicating whether a file was created or if the process should exit.
 */
export async function ensureFilesOrPrompt(args: {
  cwd: string;
  primaryEnv: string;
  primaryExample: string;
  alreadyWarnedMissingEnv: boolean;
  isYesMode: boolean;
  isCiMode: boolean;
}) {
  const {
    cwd,
    primaryEnv,
    primaryExample,
    alreadyWarnedMissingEnv,
    isYesMode,
    isCiMode,
  } = args;
  const envPath = path.resolve(cwd, primaryEnv);
  const examplePath = path.resolve(cwd, primaryExample);
  const envExists = fs.existsSync(envPath);
  const exampleExists = fs.existsSync(examplePath);

  // Case 1: no .env and no .env.example
  if (!envExists && !exampleExists) {
    const hasAnyEnv = fs.readdirSync(cwd).some((f) => f.startsWith('.env'));
    if (!hasAnyEnv) {
      console.log(
        chalk.yellow(
          '⚠️  No .env* or .env.example file found. Skipping comparison.',
        ),
      );
      return { didCreate: false, shouldExit: true, exitCode: 0 };
    }
  }

  // Case 2: missing .env but has .env.example
  if (!envExists && exampleExists) {
    if (!alreadyWarnedMissingEnv) {
      console.log();
      console.log(chalk.yellow(`📄 ${path.basename(envPath)} file not found.`));
    }
    let createEnv = isYesMode
      ? true
      : isCiMode
        ? false
        : await confirmYesNo(
            `❓ Do you want to create a new ${path.basename(envPath)} file from ${path.basename(examplePath)}?`,
            { isCiMode, isYesMode },
          );

    if (!createEnv) {
      console.log(chalk.gray('🚫 Skipping .env creation.'));
      return { didCreate: false, shouldExit: true, exitCode: 0 };
    }
    const exampleContent = fs.readFileSync(examplePath, 'utf-8');
    fs.writeFileSync(envPath, exampleContent);
    console.log(
      chalk.green(
        `✅ ${path.basename(envPath)} file created successfully from ${path.basename(examplePath)}.\n`,
      ),
    );
    warnIfEnvNotIgnored({ envFile: path.basename(envPath) });
  }

  // Case 3: has .env but is missing .env.example
  if (envExists && !exampleExists) {
    console.log(
      chalk.yellow(`📄 ${path.basename(examplePath)} file not found.`),
    );
    let createExample = isYesMode
      ? true
      : isCiMode
        ? false
        : await confirmYesNo(
            `❓ Do you want to create a new ${path.basename(examplePath)} file from ${path.basename(envPath)}?`,
            { isCiMode, isYesMode },
          );

    if (!createExample) {
      console.log(chalk.gray('🚫 Skipping .env.example creation.'));
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
    console.log(
      chalk.green(
        `✅ ${path.basename(examplePath)} file created successfully from ${path.basename(envPath)}.\n`,
      ),
    );
  }

  return { didCreate: true, shouldExit: false, exitCode: 0 };
}
