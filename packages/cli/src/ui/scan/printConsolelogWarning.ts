import type { EnvUsage, VariableUsages } from '../../config/types.js';
import { normalizePath } from '../../core/helpers/normalizePath.js';
import { label, warning, error, dim, divider, header } from '../theme.js';

/**
 * Print environment variables that were logged using console.log / warn / error.
 *
 * @param logged - List of EnvUsage entries where isLogged=true
 * @param strict - Whether strict mode is enabled
 * @returns true if anything was printed
 */
export function printConsolelogWarning(
  logged: EnvUsage[],
  strict: boolean = false,
): boolean {
  if (!logged || logged.length === 0) return false;

  const indicator = strict ? error('▸') : warning('▸');

  const textColor = strict ? error : warning;

  console.log();
  console.log(
    `${indicator} ${header('Environment variables logged to console')}`,
  );
  console.log(`${divider}`);

  const grouped = logged.reduce((acc: VariableUsages, entry) => {
    if (!acc[entry.variable]) acc[entry.variable] = [];
    acc[entry.variable]!.push(entry);
    return acc;
  }, {});

  for (const [variable, usages] of Object.entries(grouped)) {
    const uniqueUsages = Array.from(
      new Map(usages.map((u) => [`${u.file}:${u.line}`, u])).values(),
    );

    const maxShow = 3;

    uniqueUsages.slice(0, maxShow).forEach((usage) => {
      const normalizedFile = normalizePath(usage.file);
      console.log(
        `${label(variable.padEnd(26))}${textColor(`${normalizedFile}:${usage.line}`)}`,
      );
    });

    if (uniqueUsages.length > maxShow) {
      console.log(
        `${label(''.padEnd(26))}${dim(`+${uniqueUsages.length - maxShow} more`)}`,
      );
    }
  }

  console.log(`${divider}`);

  return true;
}
