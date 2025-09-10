import chalk from 'chalk';
import path from 'path';
import {
  ALLOWED_CATEGORIES,
  type Category,
  type Options,
  type RawOptions,
} from './types.js';

/**
 * Parses a comma-separated list of strings into an array of strings.
 * @param val - The input value, which can be a string, an array of strings, or undefined.
 * @returns An array of strings.
 */
function parseList(val?: string | string[]): string[] {
  const arr = Array.isArray(val) ? val : val ? [val] : [];
  return arr
    .flatMap((s) => String(s).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parses a comma-separated list of strings into an array of strings.
 * @param val - The input value, which can be a string, an array of strings, or undefined.
 * @param flagName - The name of the flag being parsed (for error messages).
 * @returns An array of categories.
 */
function parseCategories(val?: string | string[], flagName = ''): Category[] {
  const raw = parseList(val);
  const bad = raw.filter((c) => !ALLOWED_CATEGORIES.includes(c as Category));
  if (bad.length) {
    console.error(
      chalk.red(
        `❌ Error: invalid ${flagName} value(s): ${bad.join(', ')}. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`,
      ),
    );
    process.exit(1);
  }
  return raw as Category[];
}

/**
 * Normalizes the raw options by providing default values and parsing specific fields.
 * @param raw - The raw options to normalize.
 * @returns The normalized options.
 */
export function normalizeOptions(raw: RawOptions): Options {
  const checkValues = raw.checkValues ?? false;
  const isCiMode = Boolean(raw.ci);
  const isYesMode = Boolean(raw.yes);
  const allowDuplicates = Boolean(raw.allowDuplicates);
  const fix = Boolean(raw.fix);
  const json = Boolean(raw.json);
  const onlyParsed = parseCategories(raw.only, '--only');
  const only = onlyParsed.length ? onlyParsed : [];
  const noColor = Boolean(raw.noColor);
  const compare = Boolean(raw.compare);
  const scanUsage = raw.scanUsage ?? !compare;
  const includeFiles = parseList(raw.includeFiles);
  const excludeFiles = parseList(raw.excludeFiles);
  const showUnused = raw.showUnused === false ? false : true;
  const showStats = raw.showStats === false ? false : true;
  const files = parseList(raw.files);
  const secrets = raw.secrets === false ? false : true;
  const strict = Boolean(raw.strict);

  const ignore = parseList(raw.ignore);
  const ignoreRegex: RegExp[] = [];
  for (const pattern of parseList(raw.ignoreRegex)) {
    try {
      ignoreRegex.push(new RegExp(pattern));
    } catch {
      console.error(
        chalk.red(`❌ Error: invalid --ignore-regex pattern: ${pattern}`),
      );
      process.exit(1);
    }
  }

  if (isCiMode && isYesMode) {
    console.log(
      chalk.yellow('⚠️  Both --ci and --yes provided; proceeding with --yes.'),
    );
  }

  const cwd = process.cwd();

  const envFlag =
    typeof raw.env === 'string' ? path.resolve(cwd, raw.env) : undefined;
  const exampleFlag =
    typeof raw.example === 'string'
      ? path.resolve(cwd, raw.example)
      : undefined;

  return {
    checkValues,
    isCiMode,
    isYesMode,
    allowDuplicates,
    fix,
    json,
    envFlag,
    exampleFlag,
    ignore,
    ignoreRegex,
    cwd,
    only,
    compare,
    noColor,
    scanUsage,
    includeFiles,
    excludeFiles,
    showUnused,
    showStats,
    files,
    secrets,
    strict,
  };
}
