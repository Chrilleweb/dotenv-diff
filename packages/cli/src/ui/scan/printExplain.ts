import type { EnvUsage } from '../../config/types.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';
import {
  accent,
  dim,
  error,
  header,
  label,
  divider,
  padLabel,
  value,
  warning,
} from '../theme.js';

export interface ExplainResult {
  /** The environment variable key being explained */
  key: string;
  /** List of env files where the key is defined */
  definedIn: string[];
  /** List of usages for the environment variable */
  usages: EnvUsage[];
  /** Indicates if the key is duplicated */
  isDuplicated: boolean;
  /** Indicates if the key is ignored */
  isIgnored: boolean;
}

/**
 * Prints a detailed explanation for a single environment variable key.
 * @param result The explain result to print
 * @returns void
 */
export function printExplain(result: ExplainResult): void {
  const { key, definedIn, usages, isDuplicated, isIgnored } = result;
  const summary = getSummary(result);

  console.log();
  console.log(`${summary.indicator} ${header(`Explain ${key}`)}`);
  console.log(divider);

  printRow('Key', value(key));
  printRow('Status', summary.text);

  console.log();

  printFileList('Defined in', definedIn);
  printUsageList(usages);

  console.log();

  printChecks({
    isDefined: definedIn.length > 0,
    isUsed: usages.length > 0,
    isDuplicated,
    isIgnored,
  });

  console.log(divider);
}

/**
 * Prints a standard two-column row.
 * @param name The label for the row
 * @param content The content for the row
 * @returns void
 */
function printRow(name: string, content: string): void {
  console.log(`${label(padLabel(name))}${content}`);
}

/**
 * Prints a continuation row aligned with the value column.
 * @param content The content for the continuation row
 * @returns void
 */
function printContinuation(content: string): void {
  console.log(`${label(padLabel(''))}${content}`);
}

/**
 * Prints env files where the key is defined.
 * @param title The title for the file list
 * @param files The list of files
 * @returns void
 */
function printFileList(title: string, files: string[]): void {
  if (files.length === 0) {
    printRow(title, error('(not found in any env file)'));
    return;
  }

  files.forEach((file, index) => {
    const content = value(normalizePath(file));

    if (index === 0) {
      printRow(title, content);
      return;
    }

    printContinuation(content);
  });
}

/**
 * Prints source usages for the key.
 * @param usages The list of usages for the environment variable
 * @returns void
 */
function printUsageList(usages: EnvUsage[]): void {
  if (usages.length === 0) {
    printRow('Used in', warning('(not found in codebase)'));
    return;
  }

  printRow(
    'Used in',
    accent(
      `${usages.length} ${usages.length === 1 ? 'location' : 'locations'}`,
    ),
  );

  for (const usage of usages) {
    printUsage(usage);
  }
}

/**
 * Prints one usage location with pattern and short code context.
 * @param usage The usage information to print
 * @returns void
 */
function printUsage(usage: EnvUsage): void {
  const location = `${normalizePath(usage.file)}:${usage.line}`;
  const context = usage.context.trim();
  const pattern = dim(`[${usage.pattern}]`);

  const content = context
    ? `${accent(location)} ${pattern}  ${dim(context)}`
    : `${accent(location)} ${pattern}`;

  printContinuation(content);
}

/**
 * Prints status checks for the key.
 * @param checks The status of various checks for the key
 * @returns void
 */
function printChecks(checks: {
  isDefined: boolean;
  isUsed: boolean;
  isDuplicated: boolean;
  isIgnored: boolean;
}): void {
  printRow('Checks', formatCheck('Defined', checks.isDefined, 'error'));
  printContinuation(formatCheck('Used', checks.isUsed, 'warning'));
  printContinuation(
    formatCheck('Not duplicated', !checks.isDuplicated, 'warning'),
  );

  if (checks.isIgnored) {
    printContinuation(warning('⚠ Key is ignored'));
  }
}

/**
 * Formats a status check row.
 * @param text The text for the check
 * @param ok Whether the check passed
 * @param failSeverity The severity of the failure ('error' or 'warning')
 * @returns The formatted check string
 */
function formatCheck(
  text: string,
  ok: boolean,
  failSeverity: 'error' | 'warning',
): string {
  if (ok) {
    return `${accent('✓')} ${accent(text)}`;
  }

  const color = failSeverity === 'error' ? error : warning;
  return `${color('✘')} ${color(text)}`;
}

/**
 * Returns the overall visual status for the explain result.
 * @param result The explain result to summarize
 * @returns An object containing the indicator and text for the summary
 */
function getSummary(result: ExplainResult): {
  indicator: string;
  text: string;
} {
  if (result.definedIn.length === 0) {
    return {
      indicator: error('▸'),
      text: error('missing from env files'),
    };
  }

  if (result.usages.length === 0 || result.isDuplicated || result.isIgnored) {
    return {
      indicator: warning('▸'),
      text: warning('needs attention'),
    };
  }

  return {
    indicator: accent('▸'),
    text: accent('ok'),
  };
}
