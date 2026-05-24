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
  key: string;
  definedIn: string[];
  usages: EnvUsage[];
  isDuplicated: boolean;
  isIgnored: boolean;
}

/**
 * Prints a detailed explanation for a single environment variable key.
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
 */
function printRow(name: string, content: string): void {
  console.log(`${label(padLabel(name))}${content}`);
}

/**
 * Prints a continuation row aligned with the value column.
 */
function printContinuation(content: string): void {
  console.log(`${label(padLabel(''))}${content}`);
}

/**
 * Prints env files where the key is defined.
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
