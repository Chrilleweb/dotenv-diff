import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applySvelteKitRules } from '../../../../src/core/frameworks/sveltekitRules.js';
import type {
  EnvUsage,
  FrameworkWarning,
} from '../../../../src/config/types.js';

vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: vi.fn((p: string) => p.replace(/\\/g, '/')),
}));

describe('applySvelteKitRules', () => {
  let warnings: FrameworkWarning[];

  const baseUsage: EnvUsage = {
    variable: 'MY_VAR',
    file: 'src/routes/+page.ts',
    line: 5,
    column: 1,
    pattern: 'process.env',
    context: '',
    imports: [],
  };

  beforeEach(() => {
    warnings = [];
    vi.clearAllMocks();
  });

  it('ignores node_modules', () => {
    applySvelteKitRules(
      { ...baseUsage, file: 'src/node_modules/pkg/index.js' },
      warnings,
    );
    expect(warnings).toHaveLength(0);
  });

  // import.meta.env
  it('warns when import.meta.env variable does not start with VITE_', () => {
    applySvelteKitRules(
      { ...baseUsage, pattern: 'import.meta.env', variable: 'API_KEY' },
      warnings,
    );
    expect(warnings).toHaveLength(1);
  });

  it('allows import.meta.env with VITE_', () => {
    applySvelteKitRules(
      { ...baseUsage, pattern: 'import.meta.env', variable: 'VITE_API' },
      warnings,
    );
    expect(warnings).toHaveLength(0);
  });

  // process.env
  it('warns when process.env used in client file', () => {
    applySvelteKitRules(baseUsage, warnings);
    expect(warnings).toHaveLength(1);
  });

  it('allows process.env in server file', () => {
    applySvelteKitRules(
      { ...baseUsage, file: 'src/routes/+server.ts' },
      warnings,
    );
    expect(warnings).toHaveLength(0);
  });

  // dynamic private
  it('warns dynamic/private in svelte file', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        file: 'src/routes/page.svelte',
        pattern: 'sveltekit',
        imports: ['$env/dynamic/private'],
      },
      warnings,
    );
    expect(warnings).toHaveLength(1);
  });

  it('warns dynamic/private with PUBLIC_ prefix', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        pattern: 'sveltekit',
        variable: 'PUBLIC_SECRET',
        imports: ['$env/dynamic/private'],
      },
      warnings,
    );
    expect(warnings).toHaveLength(1);
  });

  // dynamic public
  it('warns dynamic/public without PUBLIC_', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        pattern: 'sveltekit',
        imports: ['$env/dynamic/public'],
        variable: 'SECRET',
      },
      warnings,
    );
    expect(warnings).toHaveLength(1);
  });

  it('allows dynamic/public with PUBLIC_', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        pattern: 'sveltekit',
        imports: ['$env/dynamic/public'],
        variable: 'PUBLIC_API',
      },
      warnings,
    );
    expect(warnings).toHaveLength(0);
  });

  // static private
  it('warns static/private with PUBLIC_', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        pattern: 'sveltekit',
        imports: ['$env/static/private'],
        variable: 'PUBLIC_KEY',
      },
      warnings,
    );
    expect(warnings).toHaveLength(1);
  });

  it('warns static/private in client file', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        file: 'src/routes/+page.ts',
        pattern: 'sveltekit',
        imports: ['$env/static/private'],
      },
      warnings,
    );
    expect(warnings).toHaveLength(1);
  });

  it('allows static/private in server file', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        file: 'src/routes/+server.ts',
        pattern: 'sveltekit',
        imports: ['$env/static/private'],
      },
      warnings,
    );
    expect(warnings).toHaveLength(0);
  });

  // static public
  it('warns static/public without PUBLIC_', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        pattern: 'sveltekit',
        imports: ['$env/static/public'],
        variable: 'SECRET',
      },
      warnings,
    );
    expect(warnings).toHaveLength(1);
  });

  it('allows static/public with PUBLIC_', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        pattern: 'sveltekit',
        imports: ['$env/static/public'],
        variable: 'PUBLIC_API',
      },
      warnings,
    );
    expect(warnings).toHaveLength(0);
  });

  // sensitive keywords
  it('warns for sensitive PUBLIC_ variable', () => {
    applySvelteKitRules({ ...baseUsage, variable: 'PUBLIC_SECRET' }, warnings);
    expect(warnings).toHaveLength(1);
  });

  it('warns for sensitive VITE_ variable', () => {
    applySvelteKitRules({ ...baseUsage, variable: 'VITE_PASSWORD' }, warnings);
    expect(warnings).toHaveLength(1);
  });

  it('does nothing when no rule matches', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        file: 'src/server.ts',
        pattern: 'sveltekit',
        imports: [],
        variable: 'SAFE_VAR',
      },
      warnings,
    );
    expect(warnings).toHaveLength(0);
  });

  it('warns dynamic/private variable starting with PUBLIC_ in server file', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        file: 'src/routes/+server.ts', // server file
        pattern: 'sveltekit',
        imports: ['$env/dynamic/private'],
        variable: 'PUBLIC_SECRET_KEY',
      },
      warnings,
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0].reason).toMatch(/must not start with "PUBLIC_"/);
  });

  it('warns for sensitive PUBLIC_ variable exposed to browser', () => {
    applySvelteKitRules(
      {
        ...baseUsage,
        file: 'src/routes/+server.ts', // server file
        pattern: 'process.env',
        variable: 'PUBLIC_SECRET_TOKEN',
      },
      warnings,
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0].reason).toMatch(/Potential sensitive/);
  });
});
