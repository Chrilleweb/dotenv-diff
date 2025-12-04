import type { EnvUsage } from '../../config/types.js';
import type { frameworkWarning } from '../frameworkValidator.js';

/**
 * Next.js environment variable validation rules
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 */
export function applyNextJsRules(u: EnvUsage, warnings: frameworkWarning[]): void {
  const isServerOnlyFile =
    u.file.includes('app/api/') ||
    u.file.endsWith('.server.ts') ||
    u.file.endsWith('.server.js');

  if (u.pattern === 'process.env' && u.variable.startsWith('NEXT_PUBLIC_')) {
    if (isServerOnlyFile) {
      warnings.push({
        variable: u.variable,
        reason:
          "NEXT_PUBLIC_ variables are exposed to the browser — don't use them in server-only files",
        file: u.file,
        line: u.line,
        framework: 'next',
      });
    }
  }

  const looksLikeClientComponent =
    u.file.includes('/components/') || u.context.includes('use client');

  if (
    u.pattern === 'process.env' &&
    !u.variable.startsWith('NEXT_PUBLIC_') &&
    looksLikeClientComponent
  ) {
    warnings.push({
      variable: u.variable,
      reason:
        'Client components can only access NEXT_PUBLIC_ environment variables',
      file: u.file,
      line: u.line,
      framework: 'next',
    });
  }

  const isClientComponentFile =
    u.file.endsWith('.tsx') ||
    u.file.endsWith('.jsx') ||
    u.context.includes('use client');

  if (
    u.pattern === 'process.env' &&
    isClientComponentFile &&
    !u.variable.startsWith('NEXT_PUBLIC_')
  ) {
    warnings.push({
      variable: u.variable,
      reason:
        'process.env inside client components must use NEXT_PUBLIC_ variables',
      file: u.file,
      line: u.line,
      framework: 'next',
    });
  }
}
