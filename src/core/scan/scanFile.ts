import path from 'path';
import type { EnvUsage, ScanOptions } from '../../config/types.js';
import { ENV_PATTERNS } from '../patterns.js';
import { hasIgnoreComment } from '../security/secretDetectors.js';
import { normalizePath } from '../helpers/normalizePath.js';

/**
 * Scans a file for environment variable usage.
 * @param filePath - The path to the file being scanned.
 * @param content - The content of the file.
 * @param opts - The scan options.
 * @returns An array of environment variable usages found in the file.
 */
export function scanFile(
  filePath: string,
  content: string,
  opts: ScanOptions,
): EnvUsage[] {
  const usages: EnvUsage[] = [];
  const lines = content.split('\n');

  // Get relative path from cwd cross-platform compatible
  const relativePath = normalizePath(path.relative(opts.cwd, filePath));

  // Collect all $env imports used in this file
  const envImports: string[] = [];

  const importRegex =
    /import\s+(?:\{[^}]*\}|\w+)\s+from\s+['"](\$env\/(?:static|dynamic)\/(?:private|public))['"]/g;

  let importMatch: RegExpExecArray | null;

  while ((importMatch = importRegex.exec(content)) !== null) {
      envImports.push(importMatch[1]!);
  }

  for (const pattern of ENV_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      const variable = match[1]!;
      const matchIndex = match.index;

      // Find line and column
      const beforeMatch = content.substring(0, matchIndex);
      const lineNumber = beforeMatch.split('\n').length;
      const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
      const column =
        lastNewlineIndex === -1
          ? matchIndex + 1
          : matchIndex - lastNewlineIndex;

      // Get the context (the actual line)
      const contextLine = lines[lineNumber - 1]!;

      // Determine previous line for ignore detection
      const prevLine = lines[lineNumber - 2] ?? '';

      const isIgnored =
        hasIgnoreComment(contextLine) || hasIgnoreComment(prevLine);

      // If usage is ignored, skip it entirely
      if (isIgnored) continue;

      // Check if console.log
      const isLogged = /\bconsole\.(log|error|warn|info|debug)\s*\(/.test(
        contextLine,
      );

      usages.push({
        variable,
        file: relativePath,
        line: lineNumber,
        column,
        pattern: pattern.name,
        imports: envImports,
        context: contextLine,
        isLogged,
      });
    }
  }

  return usages;
}
