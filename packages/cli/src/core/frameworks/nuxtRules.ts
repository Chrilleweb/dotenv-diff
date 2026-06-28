import type { EnvUsage, FrameworkWarning } from '../../config/types.js';
import { normalizePath } from '../helpers/normalizePath.js';

/**
 * Nuxt environment variable validation rules.
 *
 * Background (Nuxt 3):
 *  - Runtime configuration lives in `runtimeConfig` (private, server-only) and
 *    `runtimeConfig.public` (exposed to the client) and is read via
 *    `useRuntimeConfig()`.
 *  - In production, `.env` files are NOT read at runtime, and `process.env` is
 *    not populated in the browser. Direct `process.env` access in
 *    client/universal code is therefore unreliable — `useRuntimeConfig()`
 *    should be used instead.
 *  - Environment variables only override runtime config when prefixed with
 *    `NUXT_` (private) or `NUXT_PUBLIC_` (public).
 *
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 */
export function applyNuxtRules(
  u: EnvUsage,
  warnings: FrameworkWarning[],
): void {
  // Normalize path separators for cross-platform consistency
  const normalizedFile = normalizePath(u.file);

  // Ignore node_modules
  if (normalizedFile.includes('/node_modules/')) {
    return;
  }

  // nuxt.config.* is allowed to read process.env (it feeds runtimeConfig)
  const isConfigFile = /(^|\/)nuxt\.config\.(ts|js|mjs|cjs)$/.test(
    normalizedFile,
  );

  // Server-only contexts in Nuxt:
  //  - the Nitro `server/` directory (api, routes, middleware, plugins, utils)
  //  - `.server.` suffixed files (e.g. plugins/foo.server.ts, Foo.server.vue)
  const isServerFile =
    /(^|\/)server\//.test(normalizedFile) ||
    /\.server\.(ts|js|mjs|vue)$/.test(normalizedFile);

  // process.env is unreliable in client/universal code: not available in the
  // browser and .env files are not read at runtime in production.
  if (u.pattern === 'process.env' && !isServerFile && !isConfigFile) {
    warnings.push({
      variable: u.variable,
      reason:
        'process.env is not available in the browser; use useRuntimeConfig() instead',
      file: normalizedFile,
      line: u.line,
      framework: 'nuxt',
    });
    return; // Stop processing other rules for this usage
  }

  // Warn if NUXT_PUBLIC_ contains sensitive keywords (exposed to the browser)
  if (
    u.variable.startsWith('NUXT_PUBLIC_') &&
    /SECRET|PRIVATE|PASSWORD/.test(u.variable)
  ) {
    warnings.push({
      variable: u.variable,
      reason: 'Potential sensitive environment variable exposed to the browser',
      file: normalizedFile,
      line: u.line,
      framework: 'nuxt',
    });
    return; // Stop processing other rules for this usage
  }
}
