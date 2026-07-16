import path from 'path';
import type {
  EnvPatternName,
  EnvUsage,
  ScanOptions,
} from '../../config/types.js';
import {
  ENV_PATTERNS,
  buildSveltekitAliasPatterns,
  SVELTEKIT_IMPORT_REGEX,
  SVELTEKIT_ALIAS_IMPORT_REGEX,
} from './patterns.js';
import { hasIgnoreComment } from '../security/secretDetectors.js';
import { normalizePath } from '../helpers/normalizePath.js';
import { isLikelyMinified } from '../helpers/isLikelyMinified.js';

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

  // Precompute the absolute start offset of every line once. This lets each
  // match's line/column be found with a binary search instead of re-scanning
  // the file from the start for every match (which is O(matches × file size)).
  const lineStarts: number[] = new Array(lines.length);
  let lineOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    lineStarts[i] = lineOffset;
    lineOffset += lines[i]!.length + 1; // +1 for the '\n' stripped by split
  }

  // Get relative path from cwd cross-platform compatible
  const relativePath = normalizePath(path.relative(opts.cwd, filePath));

  // Collect all $env imports used in this file
  const envImports: string[] = [];

  SVELTEKIT_IMPORT_REGEX.lastIndex = 0;
  let importMatch: RegExpExecArray | null;
  while ((importMatch = SVELTEKIT_IMPORT_REGEX.exec(content)) !== null) {
    envImports.push(importMatch[1]!);
  }

  // Resolve the framework label for bare `env` object accessors (`env.X`,
  // `{ ... } = env`), which look identical across frameworks. A `$env/*` import
  // means SvelteKit; otherwise a `loadEnv(` call means Vite. When neither is
  // present the label stays 'sveltekit' (the historical default).
  const envObjectKind: EnvPatternName =
    envImports.length > 0
      ? 'sveltekit'
      : /\bloadEnv\s*\(/.test(content)
        ? 'vite'
        : 'sveltekit';

  // Detect aliased $env imports and build dynamic patterns for them
  const allPatterns = [...ENV_PATTERNS];

  SVELTEKIT_ALIAS_IMPORT_REGEX.lastIndex = 0;
  let aliasImportMatch: RegExpExecArray | null;
  while (
    (aliasImportMatch = SVELTEKIT_ALIAS_IMPORT_REGEX.exec(content)) !== null
  ) {
    allPatterns.push(
      ...buildSveltekitAliasPatterns(
        aliasImportMatch[1]!,
        aliasImportMatch[2]!,
      ),
    );
  }

  for (const pattern of allPatterns) {
    // Reuse the pattern's own compiled regex instead of recompiling it via
    // `new RegExp(source, flags)` for every file. Resetting lastIndex is safe
    // because scanFile is fully synchronous — it runs to completion without
    // yielding, so no other scanFile invocation can interleave and clobber the
    // shared regex state.
    // NOTE: if scanFile ever becomes async, this must be revisited.
    const regex = pattern.regex;
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const variables = pattern.processor
        ? pattern.processor(match)
        : [match[1]!];

      for (const variable of variables) {
        if (!variable) continue;

        const matchIndex = match.index;

        // Find line and column via binary search over precomputed line offsets.
        // Note: For destructured variables, this points to the start of the destructuring block
        // not the specific variable location. Ideally we'd search within the match.
        const { line: lineNumber, column } = offsetToLineCol(
          lineStarts,
          matchIndex,
        );

        // Get the context (the actual line)
        const contextLine = lines[lineNumber - 1]!;

        // Ignore likely minified / bundled lines to avoid scan false positives
        if (isLikelyMinified(contextLine)) continue;

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
          pattern: pattern.envObject ? envObjectKind : pattern.name,
          imports: pattern.sourceModule ? [pattern.sourceModule] : envImports,
          context: contextLine,
          isLogged,
        });
      }
    }
  }

  return usages;
}

/**
 * Maps an absolute character offset to a 1-indexed line and column, using a
 * precomputed array of line start offsets. Runs in O(log n) per lookup.
 * @param lineStarts Absolute offset of the first character of each line.
 * @param offset The absolute character offset to locate.
 * @returns The 1-indexed line and column of the offset.
 */
function offsetToLineCol(
  lineStarts: number[],
  offset: number,
): { line: number; column: number } {
  // Binary search for the largest lineStart that is <= offset.
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid]! <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return { line: lo + 1, column: offset - lineStarts[lo]! + 1 };
}
