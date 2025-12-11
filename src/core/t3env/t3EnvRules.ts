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
  const allServerVars = schema.server;
  const allClientVars = schema.client;

  // Check if variable is used in client code but not defined in client schema
  const isClientContext =
    u.file.includes('/components/') ||
    u.file.includes('/pages/') ||
    u.file.includes('/app/') ||
    u.file.includes('client') ||
    u.file.includes('browser') ||
    u.pattern === 'import.meta.env';

  const isServerContext =
    u.file.includes('/api/') ||
    u.file.includes('server') ||
    u.file.endsWith('.server.ts') ||
    u.file.endsWith('.server.js') ||
    u.pattern === 'process.env';

  // Variable used in client context but only defined in server schema
  if (
    isClientContext &&
    allServerVars.includes(u.variable) &&
    !allClientVars.includes(u.variable)
  ) {
    warnings.push({
      variable: u.variable,
      reason: `Variable "${u.variable}" is used in client code but only defined in server schema. Add to client schema or move to server-only code.`,
      file: u.file,
      line: u.line,
      framework: 't3-env',
    });
  }

  // Variable used in server context but only defined in client schema
  if (
    isServerContext &&
    allClientVars.includes(u.variable) &&
    !allServerVars.includes(u.variable)
  ) {
    warnings.push({
      variable: u.variable,
      reason: `Variable "${u.variable}" is used in server code but only defined in client schema. This may expose client variables on the server.`,
      file: u.file,
      line: u.line,
      framework: 't3-env',
    });
  }

  // Variable not defined in any schema
  if (
    !allServerVars.includes(u.variable) &&
    !allClientVars.includes(u.variable)
  ) {
    warnings.push({
      variable: u.variable,
      reason: `Variable "${u.variable}" is not defined in t3-env schema. Add it to either server or client schema.`,
      file: u.file,
      line: u.line,
      framework: 't3-env',
    });
  }

  // Warn about NEXT_PUBLIC_ variables in t3-env projects
  if (u.variable.startsWith('NEXT_PUBLIC_')) {
    warnings.push({
      variable: u.variable,
      reason: `Use t3-env client schema instead of NEXT_PUBLIC_ prefix for type-safe environment variables.`,
      file: u.file,
      line: u.line,
      framework: 't3-env',
    });
  }
}
