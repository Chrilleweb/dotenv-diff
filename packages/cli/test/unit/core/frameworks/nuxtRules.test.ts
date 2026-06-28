import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyNuxtRules } from '../../../../src/core/frameworks/nuxtRules.js';
import type {
  EnvUsage,
  FrameworkWarning,
} from '../../../../src/config/types.js';

vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: vi.fn((p: string) => p.replace(/\\/g, '/')),
}));

describe('applyNuxtRules', () => {
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
    applyNuxtRules(
      { ...baseUsage, file: 'src/node_modules/pkg/index.js' },
      warnings,
    );

    expect(warnings).toHaveLength(0);
  });

  it('warns about process.env in client/universal code', () => {
    applyNuxtRules(baseUsage, warnings);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.framework).toBe('nuxt');
    expect(warnings[0]!.reason).toMatch(/useRuntimeConfig/);
  });

  it('allows process.env inside the server directory', () => {
    applyNuxtRules({ ...baseUsage, file: 'server/api/data.ts' }, warnings);

    expect(warnings).toHaveLength(0);
  });

  it('allows process.env in .server. suffixed files', () => {
    applyNuxtRules({ ...baseUsage, file: 'plugins/auth.server.ts' }, warnings);

    expect(warnings).toHaveLength(0);
  });

  it('allows process.env inside nuxt.config', () => {
    applyNuxtRules({ ...baseUsage, file: 'nuxt.config.ts' }, warnings);

    expect(warnings).toHaveLength(0);
  });

  it('warns about sensitive NUXT_PUBLIC_ variable', () => {
    applyNuxtRules(
      {
        ...baseUsage,
        variable: 'NUXT_PUBLIC_API_SECRET',
        file: 'server/api/data.ts',
      },
      warnings,
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/sensitive/);
  });

  it('does not warn for a safe NUXT_PUBLIC_ variable', () => {
    applyNuxtRules(
      {
        ...baseUsage,
        variable: 'NUXT_PUBLIC_API_BASE',
        file: 'server/api/data.ts',
      },
      warnings,
    );

    expect(warnings).toHaveLength(0);
  });

  it('does nothing when no rule matches', () => {
    applyNuxtRules(
      { ...baseUsage, variable: 'API_SECRET', file: 'server/api/data.ts' },
      warnings,
    );

    expect(warnings).toHaveLength(0);
  });

  it('does not warn for import.meta.env usage (supported by Nuxt/Vite)', () => {
    applyNuxtRules(
      { ...baseUsage, pattern: 'import.meta.env', variable: 'API_BASE' },
      warnings,
    );

    expect(warnings).toHaveLength(0);
  });
});
