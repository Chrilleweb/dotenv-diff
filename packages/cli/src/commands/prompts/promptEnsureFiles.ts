import fs from 'fs';
import path from 'path';
import { confirmYesNo } from './prompts.js';
import { warnIfEnvNotIgnored } from '../../services/git.js';
import { printPrompt } from '../../ui/compare/printPrompt.js';
import { DEFAULT_ENV_FILE } from '../../config/constants.js';
import { parseEnvLine, splitEnvLines } from '../../core/envLine.js';

/**
 * Result of ensureFilesOrPrompt function
 */
interface EnsureFilesResult {
  /** Indicates if a file was created */
  didCreate: boolean;
  /** Indicates if the process should exit */
  shouldExit: boolean;
  /** Exit code to use if the process should exit */
  exitCode: number;
}

/**
 * Arguments for ensureFilesOrPrompt function
 */
interface EnsureFilesArgs {
  /** Current working directory */
  cwd: string;
  /** Path to the primary .env file */
  primaryEnv: string;
  /** Path to the primary .env.example file */
  primaryExample: string;
  /** Indicates if the user has already been warned about a missing .env file */
  alreadyWarnedMissingEnv: boolean;
  /** Indicates if the --yes flag is set */
  isYesMode: boolean;
  /** Indicates if the --ci flag is set */
  isCiMode: boolean;
}
/**
 * Result returned when no file is created and the caller should stop cleanly
 * (e.g. user declined, CI mode, or already warned about the missing file).
 */
const EXIT_WITHOUT_CREATING: EnsureFilesResult = {
  didCreate: false,
  shouldExit: true,
  exitCode: 0,
};

/**
 * Ensures that the necessary .env files exist or prompts the user to create them.
 * This function handles only scenarios where the --compare flag is set
 * @param args - The arguments for the function.
 * @returns An object indicating whether a file was created or if the process should exit.
 */
export async function promptEnsureFiles(
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
      return EXIT_WITHOUT_CREATING;
    }
  }

  // Case 2: missing .env but has .env.example
  if (!envExists && exampleExists) {
    if (args.alreadyWarnedMissingEnv) {
      return EXIT_WITHOUT_CREATING;
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
      printPrompt.skipCreation(path.basename(envPath));
      return EXIT_WITHOUT_CREATING;
    }

    const exampleContent = fs.readFileSync(examplePath, 'utf-8');
    fs.writeFileSync(envPath, exampleContent);
    printPrompt.envCreated(envPath, examplePath);

    warnIfEnvNotIgnored({ envFile: path.basename(envPath) });
  }

  // Case 3: has .env but is missing .env.example
  if (envExists && !exampleExists) {
    if (args.alreadyWarnedMissingEnv) {
      return EXIT_WITHOUT_CREATING;
    }
    printPrompt.missingEnv(examplePath);
    let createExample: boolean;
    if (isYesMode) {
      createExample = true;
    } else if (isCiMode) {
      createExample = false;
    } else {
      createExample = await confirmYesNo(
        `Do you want to create a ${path.basename(examplePath)} file from ${path.basename(envPath)}?`,
        { isCiMode, isYesMode },
      );
    }

    if (!createExample) {
      printPrompt.skipCreation(path.basename(examplePath));
      return EXIT_WITHOUT_CREATING;
    }

    const exampleContent = toExampleContent(fs.readFileSync(envPath, 'utf-8'));

    fs.writeFileSync(examplePath, exampleContent);
    printPrompt.exampleCreated(examplePath, envPath);
  }

  return { didCreate: true, shouldExit: false, exitCode: 0 };
}

/**
 * Builds .env.example content from .env content. Keeps comments and blank
 * lines, strips every value, and drops anything that is not a `KEY=value`
 * line, such as the body of a multi-line quoted value (fx a PEM key), so no
 * secret material ends up in a file meant to be committed.
 * @param envContent - Raw content of the .env file
 * @returns Content for the .env.example file
 */
export function toExampleContent(envContent: string): string {
  const lines: string[] = [];
  let openQuote: string | null = null;

  for (const line of splitEnvLines(envContent)) {
    const trimmed = line.trim();

    // Inside a multi-line quoted value: skip until the closing quote
    if (openQuote) {
      if (trimmed.includes(openQuote)) openQuote = null;
      continue;
    }

    if (!trimmed || trimmed.startsWith('#')) {
      lines.push(trimmed);
      continue;
    }

    const parsed = parseEnvLine(line);
    if (!parsed) continue;

    lines.push(`${parsed.key}=`);
    openQuote = unclosedQuote(parsed.value);
  }

  return lines.join('\n');
}

/**
 * Returns the quote character a value opens without closing on the same line.
 * fx: `"-----BEGIN KEY-----` → `"`, `"closed"` → null, `plain` → null
 * @param value - The value part of a dotenv line
 * @returns The unclosed quote character, or null
 */
function unclosedQuote(value: string): string | null {
  const quote = value[0];
  if (quote !== '"' && quote !== "'" && quote !== '`') return null;
  return value.indexOf(quote, 1) === -1 ? quote : null;
}
