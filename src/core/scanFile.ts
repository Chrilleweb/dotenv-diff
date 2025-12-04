import path from 'path';
import type { EnvUsage, ScanOptions } from '../config/types.js';
import { ENV_PATTERNS } from './patterns.js';
import { hasIgnoreComment } from '../core/secretDetectors.js';

/**
 * Scans a file for environment variable usage.
 * @param filePath - The path to the file being scanned.
 * @param content - The content of the file.
 * @param opts - The scan options.
 * @returns An array of environment variable usages found in the file.
 */
export async function scanFile(
  filePath: string,
  content: string,
  opts: ScanOptions,
): Promise<EnvUsage[]> {
  const usages: EnvUsage[] = [];
  const lines = content.split('\n');
  const relativePath = path.relative(opts.cwd, filePath);

  for (const pattern of ENV_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      const variable = match[1];
      if (!variable) continue;
      const matchIndex = match.index;

      // Find line and column
      const beforeMatch = content.substring(0, matchIndex);
      const lineNumber = beforeMatch.split('\n').length;
      const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
      const column = matchIndex - lastNewlineIndex;

      // Get the context (the actual line)
      const contextLine = lines[lineNumber - 1]?.trim() || '';

      // Determine previous line for ignore detection
      const prevLine = lines[lineNumber - 2]?.trim() || '';

      const isIgnored =
        hasIgnoreComment(contextLine) || hasIgnoreComment(prevLine);

      // If usage is ignored, skip it entirely
      if (isIgnored) continue;

      // Check if console.log
      const isLogged = /console\.(log|error|warn|info|debug)\(/.test(
        contextLine,
      );

      usages.push({
        variable,
        file: relativePath,
        line: lineNumber,
        column,
        pattern: pattern.name,
        context: contextLine,
        isLogged,
      });
    }
  }

  return usages;
}
