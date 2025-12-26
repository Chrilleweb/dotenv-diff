import type { EnvUsage } from '../../config/types.js';
import type { frameworkWarning } from '../frameworkValidator.js';

/**
 * Next.js environment variable validation rules
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 */
export function applyNextJsRules(
  u: EnvUsage,
  warnings: frameworkWarning[],
): void {
  // Ignore node_modules
  if (u.file.includes('node_modules')) {
    return;
  }

  // Detect client components
  const isClientComponent =
    u.context.includes('use client') ||
    u.context.includes('"use client"') ||
    u.context.includes("'use client'");

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
      reason:
        "NEXT_PUBLIC_ variables are exposed to the browser — don't use them in server-only files",
      file: u.file,
      line: u.line,
      framework: 'next',
    });
    return; // Stop processing other rules for this usage
  }

  // Client components MUST use NEXT_PUBLIC_ prefix
  if (
    isClientComponent &&
    u.pattern === 'process.env' &&
    !u.variable.startsWith('NEXT_PUBLIC_')
  ) {
    warnings.push({
      variable: u.variable,
      reason:
        'Client components must use NEXT_PUBLIC_ prefix for environment variables to be accessible in the browser',
      file: u.file,
      line: u.line,
      framework: 'next',
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
      framework: 'next',
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
      reason:
        'NEXT_PUBLIC_ variables are exposed to the browser. Do not use NEXT_PUBLIC_ prefix for sensitive data',
      file: u.file,
      line: u.line,
      framework: 'next',
    });
    return; // Stop processing other rules for this usage
  }
}
