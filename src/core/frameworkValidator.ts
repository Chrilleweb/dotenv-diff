import type { EnvUsage } from '../config/types.js';

export interface frameworkWarning {
  variable: string;
  reason: string;
  file: string;
  line: number;
}

export function frameworkValidator(usages: EnvUsage[]): frameworkWarning[] {
  const warnings: frameworkWarning[] = [];

  for (const u of usages) {
    // import.meta.env needs to start with VITE_
    if (u.pattern === 'import.meta.env') {
      if (!u.variable.startsWith('VITE_')) {
        warnings.push({
          variable: u.variable,
          reason: `Variables accessed through import.meta.env must start with "VITE_"`,
          file: u.file,
          line: u.line,
        });
      }
      continue;
    }

    // process.env cannot start with VITE_
    if (u.pattern === 'process.env') {
      if (u.variable.startsWith('VITE_')) {
        warnings.push({
          variable: u.variable,
          reason: `Variables accessed through process.env cannot start with "VITE_"`,
          file: u.file,
          line: u.line,
        });
      }

      // Check for .svelte files here (before continue)
      if (u.file.endsWith('.svelte')) {
        warnings.push({
          variable: u.variable,
          reason: `Avoid using process.env inside Svelte files — use $env/static/private or $env/static/public`,
          file: u.file,
          line: u.line,
        });
      }

      continue;
    }

    // $env/static/private/* - ALL checks together
    if (
      u.pattern === 'sveltekit' &&
      u.context.includes('$env/static/private')
    ) {
      // Check 1: VITE_ prefix
      if (u.variable.startsWith('VITE_')) {
        warnings.push({
          variable: u.variable,
          reason: `$env/static/private variables must not start with "VITE_" (private server env)`,
          file: u.file,
          line: u.line,
        });
      }

      // Check 2: Usage in .svelte files
      if (u.file.match(/\.svelte$/)) {
        warnings.push({
          variable: u.variable,
          reason: `Private environment variables cannot be used in Svelte components (.svelte files)`,
          file: u.file,
          line: u.line,
        });
      }

      // Check 3: Usage in +page.ts or +layout.ts
      if (u.file.match(/\+page\.ts$|\+layout\.ts$/)) {
        warnings.push({
          variable: u.variable,
          reason: `Private env vars should only be used in +page.server.ts or +layout.server.ts`,
          file: u.file,
          line: u.line,
        });
      }

      // Check 4: PUBLIC_ prefix in private imports
      if (u.variable.startsWith('PUBLIC_')) {
        warnings.push({
          variable: u.variable,
          reason: `Variables starting with PUBLIC_ may never be used in private env imports`,
          file: u.file,
          line: u.line,
        });
      }

      continue;
    }

    // $env/static/public/*
    if (u.pattern === 'sveltekit' && u.context.includes('$env/static/public')) {
      if (u.variable.startsWith('VITE_')) {
        warnings.push({
          variable: u.variable,
          reason: `$env/static/public variables must not start with "VITE_"`,
          file: u.file,
          line: u.line,
        });
      }
      continue;
    }

    // $env/dynamic/public usage warning
    if (
      u.pattern === 'sveltekit' &&
      u.context.includes('$env/dynamic/public')
    ) {
      warnings.push({
        variable: u.variable,
        reason: `$env/dynamic/public is strongly discouraged — use $env/static/public instead for build-time safety`,
        file: u.file,
        line: u.line,
      });
    }
  }

  return warnings;
}
