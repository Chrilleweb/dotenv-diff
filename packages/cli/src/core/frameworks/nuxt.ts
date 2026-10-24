import type { Framework } from '../../config/types.js';
import { EXPOSED_SECRET_REASON, isExposedSecret } from './shared.js';

/**
 * Nuxt environment variable rules.
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
 */
export const nuxt: Framework = {
  name: 'nuxt',
  packageName: 'nuxt',

  check(usage, { file }) {
    if (
      usage.pattern === 'process.env' &&
      !isServerFile(file) &&
      !isConfigFile(file)
    ) {
      return 'process.env is not available in the browser; use useRuntimeConfig() instead';
    }

    if (isExposedSecret(usage.variable, ['NUXT_PUBLIC_'])) {
      return EXPOSED_SECRET_REASON;
    }

    return undefined;
  },
};

/**
 * nuxt.config.* is allowed to read process.env (it feeds runtimeConfig)
 */
function isConfigFile(file: string): boolean {
  return /(^|\/)nuxt\.config\.(ts|js|mjs|cjs)$/.test(file);
}

/**
 * Server-only contexts in Nuxt:
 *  - the Nitro `server/` directory (api, routes, middleware, plugins, utils)
 *  - `.server.` suffixed files (e.g. plugins/foo.server.ts, Foo.server.vue)
 */
function isServerFile(file: string): boolean {
  return /(^|\/)server\//.test(file) || /\.server\.(ts|js|mjs|vue)$/.test(file);
}
