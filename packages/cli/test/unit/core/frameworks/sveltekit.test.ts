import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUsages } from '../../../../src/core/frameworks/frameworkValidator.js';
import { sveltekit } from '../../../../src/core/frameworks/sveltekit.js';
import type {
  EnvUsage,
  FrameworkWarning,
} from '../../../../src/config/types.js';

vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: vi.fn((p: string) => p.replace(/\\/g, '/')),
}));

/** Runs the SvelteKit rules on a single usage */
const validate = (usage: EnvUsage, fileContentMap?: Map<string, string>) =>
  validateUsages([usage], sveltekit, fileContentMap);

describe('SvelteKit rules', () => {
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

  // $app/env/private (SvelteKit 3)
  it('warns when $app/env/private is used in client code', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'sveltekit',
      variable: 'API_KEY',
      file: 'src/routes/+page.svelte',
      imports: ['$app/env/private'],
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toContain('$app/env/private');
  });

  it('allows $app/env/private in server files and $app/env/public anywhere', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'sveltekit',
      variable: 'API_KEY',
      file: 'src/routes/+page.server.ts',
      imports: ['$app/env/private'],
    });
    warnings.push(
      ...validate({
        ...baseUsage,
        pattern: 'sveltekit',
        variable: 'SENTRY_DSN',
        file: 'src/routes/+page.svelte',
        imports: ['$app/env/public'],
      }),
    );
    expect(warnings).toHaveLength(0);
  });

  it('ignores node_modules', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/node_modules/pkg/index.js',
    });
    expect(warnings).toHaveLength(0);
  });

  // import.meta.env
  it('warns when import.meta.env variable does not start with VITE_', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'import.meta.env',
      variable: 'API_KEY',
    });
    expect(warnings).toHaveLength(1);
  });

  it('allows import.meta.env with VITE_', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'import.meta.env',
      variable: 'VITE_API',
    });
    expect(warnings).toHaveLength(0);
  });

  // process.env
  it('warns when process.env used in client file', () => {
    warnings = validate(baseUsage);
    expect(warnings).toHaveLength(1);
  });

  it('allows process.env in server file', () => {
    warnings = validate({ ...baseUsage, file: 'src/routes/+server.ts' });
    expect(warnings).toHaveLength(0);
  });

  it('allows process.env in $lib/server directory', () => {
    // Regression: src/lib/server is SvelteKit's enforced server-only directory,
    // so process.env there must not be flagged as client-side usage.
    warnings = validate({ ...baseUsage, file: 'src/lib/server/db.ts' });
    expect(warnings).toHaveLength(0);
  });

  it('allows process.env in a nested $lib/server file', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/lib/server/auth/tokens.ts',
    });
    expect(warnings).toHaveLength(0);
  });

  it('still warns for process.env in a non-server $lib file', () => {
    warnings = validate({ ...baseUsage, file: 'src/lib/utils.ts' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/process\.env should only be used/);
  });

  it('allows process.env in svelte.config.js', () => {
    warnings = validate({ ...baseUsage, file: 'svelte.config.js' });
    expect(warnings).toHaveLength(0);
  });

  it('allows process.env in svelte.config.ts', () => {
    warnings = validate({ ...baseUsage, file: 'svelte.config.ts' });
    expect(warnings).toHaveLength(0);
  });

  // dynamic private
  it('warns dynamic/private in svelte file', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/routes/page.svelte',
      pattern: 'sveltekit',
      imports: ['$env/dynamic/private'],
    });
    expect(warnings).toHaveLength(1);
  });

  it('warns dynamic/private with PUBLIC_ prefix', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'sveltekit',
      variable: 'PUBLIC_SECRET',
      imports: ['$env/dynamic/private'],
    });
    expect(warnings).toHaveLength(1);
  });

  // dynamic public
  it('warns dynamic/public without PUBLIC_', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'sveltekit',
      imports: ['$env/dynamic/public'],
      variable: 'SECRET',
    });
    expect(warnings).toHaveLength(1);
  });

  it('allows dynamic/public with PUBLIC_', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'sveltekit',
      imports: ['$env/dynamic/public'],
      variable: 'PUBLIC_API',
    });
    expect(warnings).toHaveLength(0);
  });

  // static private
  it('warns static/private with PUBLIC_', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'sveltekit',
      imports: ['$env/static/private'],
      variable: 'PUBLIC_KEY',
    });
    expect(warnings).toHaveLength(1);
  });

  it('warns static/private in client file', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/routes/+page.ts',
      pattern: 'sveltekit',
      imports: ['$env/static/private'],
    });
    expect(warnings).toHaveLength(1);
  });

  it('allows static/private in server file', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/routes/+server.ts',
      pattern: 'sveltekit',
      imports: ['$env/static/private'],
    });
    expect(warnings).toHaveLength(0);
  });

  // static public
  it('warns static/public without PUBLIC_', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'sveltekit',
      imports: ['$env/static/public'],
      variable: 'SECRET',
    });
    expect(warnings).toHaveLength(1);
  });

  it('allows static/public with PUBLIC_', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'sveltekit',
      imports: ['$env/static/public'],
      variable: 'PUBLIC_API',
    });
    expect(warnings).toHaveLength(0);
  });

  // sensitive keywords
  it('warns for sensitive PUBLIC_ variable', () => {
    warnings = validate({ ...baseUsage, variable: 'PUBLIC_SECRET' });
    expect(warnings).toHaveLength(1);
  });

  it('warns for sensitive VITE_ variable', () => {
    warnings = validate({ ...baseUsage, variable: 'VITE_PASSWORD' });
    expect(warnings).toHaveLength(1);
  });

  it('does nothing when no rule matches', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/server.ts',
      pattern: 'sveltekit',
      imports: [],
      variable: 'SAFE_VAR',
    });
    expect(warnings).toHaveLength(0);
  });

  it('warns dynamic/private variable starting with PUBLIC_ in server file', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/routes/+server.ts', // server file
      pattern: 'sveltekit',
      imports: ['$env/dynamic/private'],
      variable: 'PUBLIC_SECRET_KEY',
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/must not start with "PUBLIC_"/);
  });

  it('warns for sensitive PUBLIC_ variable exposed to browser', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/routes/+server.ts', // server file
      pattern: 'process.env',
      variable: 'PUBLIC_SECRET_TOKEN',
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/Potential sensitive/);
  });
});
