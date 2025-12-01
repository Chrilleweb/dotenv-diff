import type { EnvUsage } from '../config/types.js';

export interface EnvWarning {
  variable: string;
  reason: string;
  file: string;
  line: number;
}

export function validateEnvRules(usages: EnvUsage[]): EnvWarning[] {
  const warnings: EnvWarning[] = [];

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
      continue;
    }

    // $env/static/private/*
    if (
      u.pattern === 'sveltekit' &&
      u.context.includes('$env/static/private')
    ) {
      if (u.variable.startsWith('VITE_')) {
        warnings.push({
          variable: u.variable,
          reason: `$env/static/private variables must not start with "VITE_" (private server env)`,
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
  }

  return warnings;
}
