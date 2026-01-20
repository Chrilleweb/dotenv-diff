import type { EnvUsage, FrameworkWarning } from '../../config/types.js';
import { normalizePath } from './../helpers/normalizePath.js';

/**
 * Applies SvelteKit specific rules to environment variable usage
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 */
export function applySvelteKitRules(
  u: EnvUsage,
  warnings: FrameworkWarning[],
): void {
  // Normalize path separators for cross-platform consistency
  const normalizedFile = normalizePath(u.file);

  // Ignore node_modules
  if (normalizedFile.includes('/node_modules/')) {
    return;
  }

  const isServerFile =
    // SvelteKit route server files
    normalizedFile.includes('/+server.') ||
    normalizedFile.includes('.server.') ||
    // hooks.server.ts / handle.server.ts etc.
    /\/(hooks|handle)\.server\.(ts|js)$/.test(normalizedFile) ||
    // generic server.ts fallback
    /\/server\.(ts|js)$/.test(normalizedFile);

  const isClientFile =
    !normalizedFile.includes('.server.') &&
    (normalizedFile.includes('/hooks.client.') ||
      normalizedFile.includes('/+page.') ||
      normalizedFile.includes('/+layout.'));

  const isSvelteFile = /\.svelte$/.test(normalizedFile);

  // import.meta.env
  if (u.pattern === 'import.meta.env' && !u.variable.startsWith('VITE_')) {
    warnings.push({
      variable: u.variable,
      reason: `Variables accessed through import.meta.env must start with "VITE_"`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
    return; // Stop processing other rules for this usage
  }

  // process.env
  if (u.pattern === 'process.env') {
    if (!isServerFile) {
      warnings.push({
        variable: u.variable,
        reason: `process.env should only be used in server files`,
        file: normalizedFile,
        line: u.line,
        framework: 'sveltekit',
      });
      return;
    }
  }

  // $env/dynamic/private
  if (
    u.pattern === 'sveltekit' &&
    u.imports?.includes('$env/dynamic/private') &&
    (isSvelteFile || isClientFile)
  ) {
    warnings.push({
      variable: u.variable,
      reason: `$env/dynamic/private cannot be used in client-side code`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
    return;
  }

  if (
    u.pattern === 'sveltekit' &&
    u.imports?.includes('$env/dynamic/private') &&
    u.variable.startsWith('PUBLIC_')
  ) {
    warnings.push({
      variable: u.variable,
      reason: `$env/dynamic/private variables must not start with "PUBLIC_"`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
    return;
  }

  //$env/dynamic/public
  if (
    u.pattern === 'sveltekit' &&
    u.imports?.includes('$env/dynamic/public') &&
    !u.variable.startsWith('PUBLIC_')
  ) {
    warnings.push({
      variable: u.variable,
      reason: `$env/dynamic/public variables must start with "PUBLIC_"`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
    return;
  }

  // $env/static/private
  if (u.pattern === 'sveltekit' && u.imports?.includes('$env/static/private')) {
    if (u.variable.startsWith('PUBLIC_')) {
      warnings.push({
        variable: u.variable,
        reason: `$env/static/private variables must not start with "PUBLIC_"`,
        file: normalizedFile,
        line: u.line,
        framework: 'sveltekit',
      });
      return;
    }

    if (isSvelteFile || isClientFile) {
      warnings.push({
        variable: u.variable,
        reason: `$env/static/private variables cannot be used in client-side code`,
        file: normalizedFile,
        line: u.line,
        framework: 'sveltekit',
      });
      return;
    }
  }

  // $env/static/public
  if (
    u.pattern === 'sveltekit' &&
    u.imports?.includes('$env/static/public') &&
    !u.variable.startsWith('PUBLIC_')
  ) {
    warnings.push({
      variable: u.variable,
      reason: `$env/static/public variables must start with "PUBLIC_"`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
    return;
  }
}
