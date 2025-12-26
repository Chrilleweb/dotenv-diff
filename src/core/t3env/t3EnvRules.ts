import type { EnvUsage, T3EnvSchema } from '../../config/types.js';
import type { T3EnvWarning } from '../../config/types.js';

/**
 * Applies t3-env specific validation rules
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 * @param schema - The t3-env schema to validate against
 */
export function applyT3EnvRules(
  u: EnvUsage,
  warnings: T3EnvWarning[],
  schema: T3EnvSchema,
): void {
  // Ignore env definition files
  if (
    u.file.endsWith('/env.ts') ||
    u.file.endsWith('/env.mjs') ||
    u.file.endsWith('/env.js') ||
    u.file.endsWith('\\env.ts') ||
    u.file.endsWith('\\env.mjs') ||
    u.file.endsWith('\\env.js')
  ) {
    return;
  }

  // Ignore node_modules
  if (u.file.includes('node_modules')) {
    return;
  }

  const allServerVars = schema.server;
  const allClientVars = schema.client;

  // Client context = explicit "use client" directive or import.meta.env
  const isClientContext =
    u.context.includes('use client') ||
    u.context.includes('"use client"') ||
    u.context.includes("'use client'") ||
    u.pattern === 'import.meta.env';

  // Discourage NEXT_PUBLIC_ usage in t3-env projects
  if (u.variable.startsWith('NEXT_PUBLIC_')) {
    warnings.push({
      variable: u.variable,
      reason:
        'Use t3-env client schema instead of NEXT_PUBLIC_ prefix for type-safe environment variables.',
      file: u.file,
      line: u.line,
      framework: 't3-env',
    });
    return; // Stop processing after this
  }

  // Client using server-only variable (SECURITY ISSUE!)
  if (
    isClientContext &&
    allServerVars.includes(u.variable) &&
    !allClientVars.includes(u.variable)
  ) {
    warnings.push({
      variable: u.variable,
      reason: `Variable "${u.variable}" is used in client code but only defined in server schema. This will expose secrets! Add to client schema or move to server-only code.`,
      file: u.file,
      line: u.line,
      framework: 't3-env',
    });
    return;
  }

  // Variable not defined in any schema
  if (
    !allServerVars.includes(u.variable) &&
    !allClientVars.includes(u.variable)
  ) {
    warnings.push({
      variable: u.variable,
      reason: `Variable "${u.variable}" is not defined in t3-env schema. Add it to either server or client schema for type safety.`,
      file: u.file,
      line: u.line,
      framework: 't3-env',
    });
  }
}
