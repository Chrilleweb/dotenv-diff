import path from 'path';
import {
  ALLOWED_CATEGORIES,
  type Category,
  type Options,
  type RawOptions,
} from './types.js';
import {
  printInvalidCategory,
  printInvalidRegex,
  printCiYesWarning,
} from '../ui/shared/printOptionErrors.js';

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
function parseCategories(
  val?: string | string[],
  flagName = '--only',
): Category[] {
  const raw = parseList(val);
  const bad = raw.filter((c) => !ALLOWED_CATEGORIES.includes(c as Category));
  if (bad.length) {
    printInvalidCategory(flagName, bad, ALLOWED_CATEGORIES);
  }
  return raw as Category[];
}

/**
 * Parses regex patterns safely, exiting on invalid syntax.
 * @param val - The input value, which can be a string, an array of strings, or undefined.
 * @returns An array of RegExp objects.
 */
function parseRegexList(val?: string | string[]): RegExp[] {
  const regexList: RegExp[] = [];
  for (const pattern of parseList(val)) {
    try {
      regexList.push(new RegExp(pattern));
    } catch {
      printInvalidRegex(pattern);
    }
  }
  return regexList;
}

/**
 * Converts flag value to boolean.
 * @param value - The input value.
 * @returns The boolean representation.
 */
function toBool(value: unknown): boolean {
  return value === true || value === 'true';
}

/**
 * Normalizes the raw options by providing default values and parsing specific fields.
 * @param raw - The raw options to normalize.
 * @returns The normalized options.
 */
export function normalizeOptions(raw: RawOptions): Options {
  const checkValues = toBool(raw.checkValues);
  const isCiMode = toBool(raw.ci);
  const isYesMode = toBool(raw.yes);
  const allowDuplicates = toBool(raw.allowDuplicates);
  const fix = toBool(raw.fix);
  const json = toBool(raw.json);
  const noColor = toBool(raw.noColor);
  const compare = toBool(raw.compare);
  const strict = toBool(raw.strict);
  const scanUsage = raw.scanUsage ?? !compare;

  const showUnused = raw.showUnused !== false;
  const showStats = raw.showStats !== false;
  const secrets = raw.secrets !== false;

  const only = parseCategories(raw.only);
  const ignore = parseList(raw.ignore);
  const ignoreRegex = parseRegexList(raw.ignoreRegex);
  const includeFiles = parseList(raw.includeFiles);
  const excludeFiles = parseList(raw.excludeFiles);
  const files = parseList(raw.files);

  const noCompare = toBool(raw.noCompare);

  const ignoreUrls = parseList(raw.ignoreUrls);
  const uppercaseKeys = raw.uppercaseKeys !== false;
  const expireWarnings = raw.expireWarnings !== false;

  const cwd = process.cwd();
  const envFlag =
    typeof raw.env === 'string' ? path.resolve(cwd, raw.env) : undefined;
  const exampleFlag =
    typeof raw.example === 'string'
      ? path.resolve(cwd, raw.example)
      : undefined;

  if (isCiMode && isYesMode) {
    printCiYesWarning();
  }

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
    ignoreUrls,
    noCompare,
    uppercaseKeys,
    expireWarnings,
  };
}
