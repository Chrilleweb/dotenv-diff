import chalk from 'chalk';
import path from 'path';

export type Options = {
  checkValues: boolean;
  isCiMode: boolean;
  isYesMode: boolean;
  envFlag: string | null;
  exampleFlag: string | null;
  cwd: string;
};

export function normalizeOptions(raw: any): Options {
  const checkValues = raw.checkValues ?? false;
  const isCiMode = Boolean(raw.ci);
  const isYesMode = Boolean(raw.yes);

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

  return { checkValues, isCiMode, isYesMode, envFlag, exampleFlag, cwd };
}
