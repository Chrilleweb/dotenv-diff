import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUsages } from '../../../../src/core/frameworks/frameworkValidator.js';
import { nuxt } from '../../../../src/core/frameworks/nuxt.js';
import type {
  EnvUsage,
  FrameworkWarning,
} from '../../../../src/config/types.js';

vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: vi.fn((p: string) => p.replace(/\\/g, '/')),
}));

/** Runs the Nuxt rules on a single usage */
const validate = (usage: EnvUsage, fileContentMap?: Map<string, string>) =>
  validateUsages([usage], nuxt, fileContentMap);

describe('Nuxt rules', () => {
  let warnings: FrameworkWarning[];

  const baseUsage: EnvUsage = {
    variable: 'API_SECRET',
    file: 'pages/index.vue',
    line: 5,
    column: 3,
    pattern: 'process.env',
    context: 'process.env.API_SECRET',
    imports: [],
    isLogged: false,
  };

  beforeEach(() => {
    warnings = [];
    vi.clearAllMocks();
  });

  it('ignores files inside node_modules', () => {
    warnings = validate({
      ...baseUsage,
      file: 'src/node_modules/pkg/index.js',
    });

    expect(warnings).toHaveLength(0);
  });

  it('warns about process.env in client/universal code', () => {
    warnings = validate(baseUsage);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.framework).toBe('nuxt');
    expect(warnings[0]!.reason).toMatch(/useRuntimeConfig/);
  });

  it('allows process.env inside the server directory', () => {
    warnings = validate({ ...baseUsage, file: 'server/api/data.ts' });

    expect(warnings).toHaveLength(0);
  });

  it('allows process.env in .server. suffixed files', () => {
    warnings = validate({ ...baseUsage, file: 'plugins/auth.server.ts' });

    expect(warnings).toHaveLength(0);
  });

  it('allows process.env inside nuxt.config', () => {
    warnings = validate({ ...baseUsage, file: 'nuxt.config.ts' });

    expect(warnings).toHaveLength(0);
  });

  it('warns about sensitive NUXT_PUBLIC_ variable', () => {
    warnings = validate({
      ...baseUsage,
      variable: 'NUXT_PUBLIC_API_SECRET',
      file: 'server/api/data.ts',
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/sensitive/);
  });

  it('does not warn for a safe NUXT_PUBLIC_ variable', () => {
    warnings = validate({
      ...baseUsage,
      variable: 'NUXT_PUBLIC_API_BASE',
      file: 'server/api/data.ts',
    });

    expect(warnings).toHaveLength(0);
  });

  it('does nothing when no rule matches', () => {
    warnings = validate({
      ...baseUsage,
      variable: 'API_SECRET',
      file: 'server/api/data.ts',
    });

    expect(warnings).toHaveLength(0);
  });

  it('does not warn for import.meta.env usage (supported by Nuxt/Vite)', () => {
    warnings = validate({
      ...baseUsage,
      pattern: 'import.meta.env',
      variable: 'API_BASE',
    });

    expect(warnings).toHaveLength(0);
  });
});
