import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUsages } from '../../../../src/core/frameworks/frameworkValidator.js';
import { nextjs } from '../../../../src/core/frameworks/nextjs.js';
import type {
  EnvUsage,
  FrameworkWarning,
} from '../../../../src/config/types.js';

vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: vi.fn((p: string) => p.replace(/\\/g, '/')),
}));

/** Runs the Next.js rules on a single usage */
const validate = (usage: EnvUsage, fileContentMap?: Map<string, string>) =>
  validateUsages([usage], nextjs, fileContentMap);

describe('Next.js rules', () => {
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
    warnings = validate({
      ...baseUsage,
      file: 'src/node_modules/pkg/index.js',
    });

    expect(warnings).toHaveLength(0);
  });

  it('detects client component via "use client" directive', () => {
    const map = new Map<string, string>();
    map.set(baseUsage.file, '"use client"\nconsole.log(\'test\')');

    warnings = validate(baseUsage, map);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.framework).toBe('nextjs');
    expect(warnings[0]!.reason).toMatch(/Server-only variable/);
  });

  it('detects pages router client file', () => {
    warnings = validate({ ...baseUsage, file: 'pages/index.tsx' });

    expect(warnings).toHaveLength(1);
  });

  it('does not treat pages/api as client', () => {
    warnings = validate({ ...baseUsage, file: 'pages/api/route.ts' });

    expect(warnings).toHaveLength(0);
  });

  it('detects client component via bare use client directive', () => {
    const map = new Map<string, string>();
    map.set(baseUsage.file, 'use client;\nconst x = 1;');

    warnings = validate(baseUsage, map);

    expect(warnings).toHaveLength(1);
  });

  it('does nothing when fileContentMap exists but fileContent is undefined', () => {
    const map = new Map<string, string>(); // empty folder

    warnings = validate(baseUsage, map);

    expect(warnings).toHaveLength(0);
  });

  it('warns about Vite syntax', () => {
    warnings = validate({ ...baseUsage, pattern: 'import.meta.env' });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/process\.env/);
  });

  it('warns about sensitive NEXT_PUBLIC variable', () => {
    warnings = validate({
      ...baseUsage,
      variable: 'NEXT_PUBLIC_SECRET_KEY',
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/sensitive/);
  });

  it('does not warn for valid NEXT_PUBLIC usage in client component', () => {
    const map = new Map<string, string>();
    map.set(baseUsage.file, "'use client'");

    warnings = validate(
      {
        ...baseUsage,
        variable: 'NEXT_PUBLIC_API_URL',
      },
      map,
    );

    expect(warnings).toHaveLength(0);
  });

  it('does nothing when no rule matches', () => {
    warnings = validate({
      ...baseUsage,
      variable: 'SERVER_SECRET',
      file: 'server-only.ts',
    });

    expect(warnings).toHaveLength(0);
  });

  it('stops processing after first matching rule (early return)', () => {
    const map = new Map<string, string>();
    map.set(baseUsage.file, "'use client'");

    warnings = validate(
      {
        ...baseUsage,
        variable: 'MY_SECRET',
        pattern: 'import.meta.env',
      },
      map,
    );

    expect(warnings).toHaveLength(1);
  });
});
