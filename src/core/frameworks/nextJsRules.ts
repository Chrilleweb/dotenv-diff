import type { EnvUsage } from '../../config/types.js';
import type { frameworkWarning } from '../frameworkValidator.js';

/**
 * Next.js environment variable validation rules
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 * @param fileContentMap - Optional map of file paths to their content for detecting client components
 */
export function applyNextJsRules(
  u: EnvUsage,
  warnings: frameworkWarning[],
  fileContentMap?: Map<string, string>,
): void {
  // Ignore node_modules
  if (u.file.includes('node_modules')) {
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
  // Fallback to context-based detection (less reliable)
  if (!isClientComponent) {
    isClientComponent =
      u.context.includes('use client') ||
      u.context.includes('"use client"') ||
      u.context.includes("'use client'");
  }

  // Detect server-only files
  const isServerOnlyFile =
    u.file.includes('/app/api/') ||
    u.file.includes('/pages/api/') ||
    u.file.endsWith('.server.ts') ||
    u.file.endsWith('.server.tsx') ||
    u.file.endsWith('.server.js') ||
    u.file.endsWith('.server.jsx') ||
    u.file.endsWith('middleware.ts') ||
    u.file.endsWith('middleware.js') ||
    u.file.includes('/route.ts') ||
    u.file.includes('/route.js');

  // Server-only files should NOT use NEXT_PUBLIC_ variables
  if (isServerOnlyFile && u.variable.startsWith('NEXT_PUBLIC_')) {
    warnings.push({
      variable: u.variable,
      reason: 'NEXT_PUBLIC_ variable used in server-only file',
      file: u.file,
      line: u.line,
      framework: 'nextjs',
    });
    return; // Stop processing other rules for this usage
  }

  // Client components MUST use NEXT_PUBLIC_ prefix
  if (isClientComponent && !u.variable.startsWith('NEXT_PUBLIC_')) {
    warnings.push({
      variable: u.variable,
      reason: 'Server-only variable accessed from client code',
      file: u.file,
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
      file: u.file,
      line: u.line,
      framework: 'nextjs',
    });
    return; // Stop processing other rules for this usage
  }

  // Warn if NEXT_PUBLIC_ contains sensitive keywords
  if (
    u.variable.startsWith('NEXT_PUBLIC_') &&
    (u.variable.includes('SECRET') ||
      u.variable.includes('PRIVATE') ||
      u.variable.includes('KEY') ||
      u.variable.includes('TOKEN') ||
      u.variable.includes('PASSWORD'))
  ) {
    warnings.push({
      variable: u.variable,
      reason: 'Sensitive data marked as public',
      file: u.file,
      line: u.line,
      framework: 'nextjs',
    });
    return; // Stop processing other rules for this usage
  }
}
