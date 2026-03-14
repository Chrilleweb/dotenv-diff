import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyNextJsRules } from '../../../../src/core/frameworks/nextJsRules.js';
import type {
  EnvUsage,
  FrameworkWarning,
} from '../../../../src/config/types.js';

vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: vi.fn((p: string) => p.replace(/\\/g, '/')),
}));

describe('applyNextJsRules', () => {
  let warnings: FrameworkWarning[];

  const baseUsage: EnvUsage = {
    variable: 'MY_SECRET',
    file: 'src/app/page.tsx',
    line: 5,
    column: 3,
    pattern: 'process.env',
    context: 'process.env.MY_SECRET',
    imports: [],
    isLogged: false,
  };

  beforeEach(() => {
    warnings = [];
    vi.clearAllMocks();
  });

  it('ignores files inside node_modules', () => {
    applyNextJsRules(
      {
        ...baseUsage,
        file: 'src/node_modules/pkg/index.js',
      },
      warnings,
    );

    expect(warnings).toHaveLength(0);
  });

  it('detects client component via "use client" directive', () => {
    const map = new Map<string, string>();
    map.set(baseUsage.file, `"use client"\nconsole.log('test')`);

    applyNextJsRules(baseUsage, warnings, map);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].framework).toBe('nextjs');
    expect(warnings[0].reason).toMatch(/Server-only variable/);
  });

  it('detects pages router client file', () => {
    applyNextJsRules({ ...baseUsage, file: 'pages/index.tsx' }, warnings);

    expect(warnings).toHaveLength(1);
  });

  it('does not treat pages/api as client', () => {
    applyNextJsRules({ ...baseUsage, file: 'pages/api/route.ts' }, warnings);

    expect(warnings).toHaveLength(0);
  });

  it('detects client component via bare use client directive', () => {
    const map = new Map<string, string>();
    map.set(baseUsage.file, `use client;\nconst x = 1;`);

    applyNextJsRules(baseUsage, warnings, map);

    expect(warnings).toHaveLength(1);
  });

  it('does nothing when fileContentMap exists but fileContent is undefined', () => {
    const map = new Map<string, string>(); // empty folder

    applyNextJsRules(baseUsage, warnings, map);

    expect(warnings).toHaveLength(0);
  });

  it('warns about Vite syntax', () => {
    applyNextJsRules({ ...baseUsage, pattern: 'import.meta.env' }, warnings);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].reason).toMatch(/process\.env/);
  });

  it('warns about sensitive NEXT_PUBLIC variable', () => {
    applyNextJsRules(
      {
        ...baseUsage,
        variable: 'NEXT_PUBLIC_SECRET_KEY',
      },
      warnings,
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0].reason).toMatch(/sensitive/);
  });

  it('does not warn for valid NEXT_PUBLIC usage in client component', () => {
    const map = new Map<string, string>();
    map.set(baseUsage.file, `'use client'`);

    applyNextJsRules(
      {
        ...baseUsage,
        variable: 'NEXT_PUBLIC_API_URL',
      },
      warnings,
      map,
    );

    expect(warnings).toHaveLength(0);
  });

  it('does nothing when no rule matches', () => {
    applyNextJsRules(
      {
        ...baseUsage,
        variable: 'SERVER_SECRET',
        file: 'server-only.ts',
      },
      warnings,
    );

    expect(warnings).toHaveLength(0);
  });

  it('stops processing after first matching rule (early return)', () => {
    const map = new Map<string, string>();
    map.set(baseUsage.file, `'use client'`);

    applyNextJsRules(
      {
        ...baseUsage,
        variable: 'MY_SECRET',
        pattern: 'import.meta.env',
      },
      warnings,
      map,
    );

    expect(warnings).toHaveLength(1);
  });
});
