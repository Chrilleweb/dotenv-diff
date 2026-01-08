import { type EnvUsage, type frameworkWarning } from '../../config/types.js';
import { normalizePath } from './../helpers/normalizePath.js';

/**
 * Applies SvelteKit specific rules to environment variable usage
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 */
export function applySvelteKitRules(
  u: EnvUsage,
  warnings: frameworkWarning[],
): void {
  // Normalize path separators for cross-platform consistency
  const normalizedFile = normalizePath(u.file);

  // Ignore node_modules
  if (normalizedFile.includes('/node_modules/')) {
    return;
  }

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

  if (u.pattern === 'process.env' && u.variable.startsWith('VITE_')) {
    warnings.push({
      variable: u.variable,
      reason: `process.env cannot access VITE_ (client-side) variables`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
    return;
  }
  // process.env in .svelte files
  if (u.pattern === 'process.env' && /\.svelte$/.test(normalizedFile)) {
    warnings.push({
      variable: u.variable,
      reason: `process.env used inside .svelte file`,
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

    if (/\.svelte$/.test(normalizedFile)) {
      warnings.push({
        variable: u.variable,
        reason: `Private env vars cannot be used in Svelte components`,
        file: normalizedFile,
        line: u.line,
        framework: 'sveltekit',
      });
      return;
    }

    if (/\+(page|layout)\.(ts|js)$/.test(normalizedFile)) {
      warnings.push({
        variable: u.variable,
        reason: `Private env vars should only be used in server files`,
        file: normalizedFile,
        line: u.line,
        framework: 'sveltekit',
      });
      return;
    }

    if (u.variable.startsWith('PUBLIC_')) {
      warnings.push({
        variable: u.variable,
        reason: `PUBLIC_ variables may never be used in private imports`,
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
    u.variable.startsWith('VITE_')
  ) {
    warnings.push({
      variable: u.variable,
      reason: `$env/static/public variables must not start with "VITE_"`,
      file: normalizedFile,
      line: u.line,
      framework: 'sveltekit',
    });
  }
}
