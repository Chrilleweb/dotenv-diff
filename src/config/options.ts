import chalk from 'chalk';
import path from 'path';

export type Options = {
  checkValues: boolean;
  isCiMode: boolean;
  isYesMode: boolean;
  allowDuplicates: boolean;
  json: boolean;
  envFlag: string | null;
  exampleFlag: string | null;
  ignore: string[];
  ignoreRegex: RegExp[];
  cwd: string;
};

type RawOptions = {
  checkValues?: boolean;
  ci?: boolean;
  yes?: boolean;
  allowDuplicates?: boolean;
  json?: boolean;
  env?: string;
  example?: string;
  ignore?: string | string[];
  ignoreRegex?: string | string[];
};

export function normalizeOptions(raw: RawOptions): Options {
  const checkValues = raw.checkValues ?? false;
  const isCiMode = Boolean(raw.ci);
  const isYesMode = Boolean(raw.yes);
  const allowDuplicates = Boolean(raw.allowDuplicates);
  const json = Boolean(raw.json);

  const parseList = (val?: string | string[]) => {
    const arr = Array.isArray(val) ? val : val ? [val] : [];
    return arr
      .flatMap((s) => s.split(','))
      .map((s) => s.trim())
      .filter(Boolean);
  };

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
  };
}
