import type { GitignoreIssue } from '../../config/types.js';
import { GITIGNORE_ISSUES } from '../../config/constants.js';
import {
  UI_LABEL_WIDTH,
  label,
  value,
  warning,
  error,
  divider,
  header,
} from '../theme.js';

/**
 * Options for printing gitignore warnings to the user.
 */
interface GitignoreWarningOptions {
  /** The name of the environment file */
  envFile: string;
  /** The reason for the gitignore warning */
  reason: GitignoreIssue;
  /** Whether strict mode is enabled */
  strict?: boolean;
  /** Optional custom log function (defaults to console.log) */
  log?: (msg: string) => void;
}

/**
 * Logs a warning about .env not being ignored by Git.
 * @param options - Options for the gitignore warning.
 * @returns void
 */
export function printGitignoreWarning(options: GitignoreWarningOptions): void {
  const { envFile, reason, strict = false, log = console.log } = options;

  const indicator = strict ? error('▸') : warning('▸');

  const issue =
    reason === GITIGNORE_ISSUES.NO_GITIGNORE
      ? 'no .gitignore found'
      : 'not ignored by git';

  log('');
  log(`${indicator} ${header('Gitignore warning')}`);
  log(`${divider}`);
  log(
    `${label('File'.padEnd(UI_LABEL_WIDTH))}${(strict ? error : warning)(envFile)}`,
  );
  log(
    `${label('Issue'.padEnd(UI_LABEL_WIDTH))}${(strict ? error : warning)(issue)}`,
  );
  log(
    `${label('Suggestion'.padEnd(UI_LABEL_WIDTH))}${value(`add ${envFile} to .gitignore`)}`,
  );
  log(`${divider}`);
}
