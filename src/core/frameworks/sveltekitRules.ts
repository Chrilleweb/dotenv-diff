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

  const isServerFile = /\/server\.(ts|js)$/.test(normalizedFile);

  const isSvelteFile = /\.svelte$/.test(normalizedFile);

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

  if (
    u.pattern === 'sveltekit' &&
    u.context.includes('$env/dynamic/private') &&
    /\.svelte$/.test(normalizedFile)
  ) {
    warnings.push({
      variable: u.variable,
      reason: `$env/dynamic/private cannot be used in Svelte components`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
    return;
  }

  // $env/static/private
  if (u.pattern === 'sveltekit' && u.context.includes('$env/static/private')) {
    if (u.variable.startsWith('VITE_')) {
      warnings.push({
        variable: u.variable,
        reason: `$env/static/private variables must not start with "VITE_"`,
        file: normalizedFile,
        line: u.line,
        framework: 'sveltekit',
      });
      return;
    }

    if (isSvelteFile) {
      warnings.push({
        variable: u.variable,
        reason: `Private env vars cannot be used in Svelte components`,
        file: normalizedFile,
        line: u.line,
        framework: 'sveltekit',
      });
      return;
    }

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
  }

  if (u.pattern === 'sveltekit' && u.context.includes('$env/dynamic/')) {
    if (!isServerFile) {
      warnings.push({
        variable: u.variable,
        reason: `$env/dynamic/* requires runtime access and should primarily be used in server files`,
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
    u.context.includes('$env/static/public') &&
    !u.variable.startsWith('PUBLIC_')
  ) {
    warnings.push({
      variable: u.variable,
      reason: `$env/static/public variables must start with "PUBLIC_"`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
  }
}
