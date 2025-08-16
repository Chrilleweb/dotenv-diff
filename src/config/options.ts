import chalk from 'chalk';
import path from 'path';
import { ALLOWED_CATEGORIES, Category, Options, RawOptions } from './types.js';

function parseList(val?: string | string[]): string[] {
  const arr = Array.isArray(val) ? val : val ? [val] : [];
  return arr
    .flatMap((s) => String(s).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

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

export function normalizeOptions(raw: RawOptions): Options {
  const checkValues = raw.checkValues ?? false;
  const isCiMode = Boolean(raw.ci);
  const isYesMode = Boolean(raw.yes);
  const allowDuplicates = Boolean(raw.allowDuplicates);
  const json = Boolean(raw.json);
  const onlyParsed = parseCategories(raw.only, '--only');
  const only = onlyParsed.length ? onlyParsed : undefined;
  const scanUsage = Boolean(raw.scanUsage);
  const includeFiles = parseList(raw.includeFiles);
  const excludeFiles = parseList(raw.excludeFiles);
  const showUnused = Boolean(raw.showUnused);
  const showStats = Boolean(raw.showStats);

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
    typeof raw.env === 'string' ? path.resolve(cwd, raw.env) : null;
  const exampleFlag =
    typeof raw.example === 'string' ? path.resolve(cwd, raw.example) : null;

  return {
    checkValues,
    isCiMode,
    isYesMode,
    allowDuplicates,
    json,
    envFlag,
    exampleFlag,
    ignore,
    ignoreRegex,
    cwd,
    only,
    scanUsage,
    includeFiles,
    excludeFiles,
    showUnused,
    showStats,
  };
}
