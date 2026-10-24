import type { Framework } from '../../config/types.js';
import { EXPOSED_SECRET_REASON, isExposedSecret } from './shared.js';

/**
 * SvelteKit environment variable rules.
 *
 * Private variables must stay on the server, and public variables must use the
 * `PUBLIC_` prefix (or `VITE_` when read through `import.meta.env`).
 */
export const sveltekit: Framework = {
  name: 'sveltekit',
  packageName: '@sveltejs/kit',

  check(usage, { file }) {
    const { variable, pattern } = usage;
    const isPublic = variable.startsWith('PUBLIC_');
    const isClientCode = isSvelteComponent(file) || isClientFile(file);
    const importsFrom = (module: string): boolean =>
      pattern === 'sveltekit' && usage.imports?.includes(module) === true;

    if (pattern === 'import.meta.env' && !variable.startsWith('VITE_')) {
      return 'Variables accessed through import.meta.env must start with "VITE_"';
    }

    if (
      pattern === 'process.env' &&
      !isServerFile(file) &&
      !isConfigFile(file)
    ) {
      return 'process.env should only be used in server files';
    }

    if (importsFrom('$env/dynamic/private')) {
      if (isClientCode) {
        return '$env/dynamic/private cannot be used in client-side code';
      }
      if (isPublic) {
        return '$env/dynamic/private variables must not start with "PUBLIC_"';
      }
    }

    if (importsFrom('$env/dynamic/public') && !isPublic) {
      return '$env/dynamic/public variables must start with "PUBLIC_"';
    }

    if (importsFrom('$env/static/private')) {
      if (isPublic) {
        return '$env/static/private variables must not start with "PUBLIC_"';
      }
      if (isClientCode) {
        return '$env/static/private variables cannot be used in client-side code';
      }
    }

    if (importsFrom('$env/static/public') && !isPublic) {
      return '$env/static/public variables must start with "PUBLIC_"';
    }

    // SvelteKit 3
    if (importsFrom('$app/env/private') && isClientCode) {
      return '$app/env/private cannot be used in client-side code';
    }

    if (isExposedSecret(variable, ['PUBLIC_', 'VITE_'])) {
      return EXPOSED_SECRET_REASON;
    }

    return undefined;
  },
};

/**
 * Config files are allowed to use process.env
 */
function isConfigFile(file: string): boolean {
  return /svelte\.config\.(ts|js)$/.test(file);
}

function isServerFile(file: string): boolean {
  return (
    // SvelteKit route server files
    file.includes('/+server.') ||
    file.includes('.server.') ||
    // hooks.server.ts / handle.server.ts etc.
    /\/(hooks|handle)\.server\.(ts|js)$/.test(file) ||
    // generic server.ts fallback
    /\/server\.(ts|js)$/.test(file) ||
    // $lib/server (src/lib/server) — SvelteKit's enforced server-only directory,
    // never bundled to the client, so process.env there is legitimate.
    /(^|\/)lib\/server\//.test(file)
  );
}

function isClientFile(file: string): boolean {
  return (
    !file.includes('.server.') &&
    (file.includes('/hooks.client.') ||
      file.includes('/+page.') ||
      file.includes('/+layout.'))
  );
}

function isSvelteComponent(file: string): boolean {
  return /\.svelte$/.test(file);
}
