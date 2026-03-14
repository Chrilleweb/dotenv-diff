import type { EnvUsage, FrameworkWarning } from '../../config/types.js';
import { normalizePath } from './../helpers/normalizePath.js';

/**
 * Next.js environment variable validation rules
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 * @param fileContentMap - Optional map of file paths to their content for detecting client components
 */
export function applyNextJsRules(
  u: EnvUsage,
  warnings: FrameworkWarning[],
  fileContentMap?: Map<string, string>,
): void {
  // Normalize path separators for cross-platform consistency
  const normalizedFile = normalizePath(u.file);

  // Ignore node_modules
  if (normalizedFile.includes('/node_modules/')) {
    return;
  }

  // Detect client components by checking the full file content
  let isClientComponent = false;
  if (fileContentMap) {
    const fileContent = fileContentMap.get(u.file);
    if (fileContent) {
      // Check first few lines for "use client" directive
      const firstLines = fileContent.split('\n').slice(0, 10).join('\n');
      isClientComponent =
        /['"]use client['"]/.test(firstLines) ||
        /^use client;?$/m.test(firstLines);
    }
  }
  // Pages Router: all non-API files are client components
  const isPagesRouterClientFile =
    /(^|\/)pages\//.test(normalizedFile) &&
    !/(^|\/)pages\/api\//.test(normalizedFile);

  isClientComponent ||= isPagesRouterClientFile;

  // Client components MUST use NEXT_PUBLIC_ prefix
  if (isClientComponent && !u.variable.startsWith('NEXT_PUBLIC_')) {
    warnings.push({
      variable: u.variable,
      reason: 'Server-only variable accessed from client code',
      file: normalizedFile,
      line: u.line,
      framework: 'nextjs',
    });
    return; // Stop processing other rules for this usage
  }

  // Warn about Vite syntax in Next.js
  if (u.pattern === 'import.meta.env') {
    warnings.push({
      variable: u.variable,
      reason: 'Next.js uses process.env, not import.meta.env (Vite syntax)',
      file: normalizedFile,
      line: u.line,
      framework: 'nextjs',
    });
    return; // Stop processing other rules for this usage
  }

  // Warn if NEXT_PUBLIC_ contains sensitive keywords
  if (
    u.variable.startsWith('NEXT_PUBLIC_') &&
    /SECRET|PRIVATE|PASSWORD/.test(u.variable)
  ) {
    warnings.push({
      variable: u.variable,
      reason: 'Potential sensitive environment variable exposed to the browser',
      file: normalizedFile,
      line: u.line,
      framework: 'nextjs',
    });
    return; // Stop processing other rules for this usage
  }
}
