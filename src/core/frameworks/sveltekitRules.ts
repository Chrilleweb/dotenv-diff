import { type EnvUsage, type frameworkWarning } from '../../config/types.js';

/**
 * Applies SvelteKit specific rules to environment variable usage
 * @param u - The environment variable usage information
 * @param warnings - The array to push warnings into
 */
export function applySvelteKitRules(
  u: EnvUsage,
  warnings: frameworkWarning[],
): void {
  if (u.pattern === 'import.meta.env') {
    if (!u.variable.startsWith('VITE_')) {
      warnings.push({
        variable: u.variable,
        reason: `Variables accessed through import.meta.env must start with "VITE_"`,
        file: u.file,
        line: u.line,
        framework: 'sveltekit',
      });
    }
  }

  if (u.pattern === 'process.env' && u.variable.startsWith('VITE_')) {
    warnings.push({
      variable: u.variable,
      reason: `process.env cannot access VITE_ (client-side) variables`,
      file: u.file,
      line: u.line,
      framework: 'sveltekit',
    });
  }
  // process.env in .svelte files
  if (u.pattern === 'process.env' && u.file.endsWith('.svelte')) {
    warnings.push({
      variable: u.variable,
      reason: `process.env used inside .svelte file`,
      file: u.file,
      line: u.line,
      framework: 'sveltekit',
    });
  }

  // $env/static/private
  if (u.pattern === 'sveltekit' && u.context.includes('$env/static/private')) {
    if (u.variable.startsWith('VITE_')) {
      warnings.push({
        variable: u.variable,
        reason: `$env/static/private variables must not start with "VITE_"`,
        file: u.file,
        line: u.line,
        framework: 'sveltekit',
      });
    }

    if (u.file.endsWith('.svelte')) {
      warnings.push({
        variable: u.variable,
        reason: `Private env vars cannot be used in Svelte components`,
        file: u.file,
        line: u.line,
        framework: 'sveltekit',
      });
    }

    if (/\+page\.ts$|\+layout\.ts$/.test(u.file)) {
      warnings.push({
        variable: u.variable,
        reason: `Private env vars should only be used in server files`,
        file: u.file,
        line: u.line,
        framework: 'sveltekit',
      });
    }

    if (u.variable.startsWith('PUBLIC_')) {
      warnings.push({
        variable: u.variable,
        reason: `PUBLIC_ variables may never be used in private imports`,
        file: u.file,
        line: u.line,
        framework: 'sveltekit',
      });
    }
  }

  // $env/static/public
  if (u.pattern === 'sveltekit' && u.context.includes('$env/static/public')) {
    if (u.variable.startsWith('VITE_')) {
      warnings.push({
        variable: u.variable,
        reason: `$env/static/public variables must not start with "VITE_"`,
        file: u.file,
        line: u.line,
        framework: 'sveltekit',
      });
    }
  }
}
