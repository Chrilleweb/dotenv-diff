import { describe, it, expect } from 'vitest';
import { scanFile } from '../../../../src/core/scan/scanFile';
import {
  DEFAULT_INCLUDE_EXTENSIONS,
  DEFAULT_EXCLUDE_PATTERNS,
  ENV_PATTERNS,
  buildSveltekitAliasPatterns,
} from '../../../../src/core/scan/patterns';
import type { ScanOptions } from '../../../../src/config/types';

describe('scanFile - Pattern Detection', () => {
  const baseOpts: ScanOptions = {
    cwd: '/test/project',
    include: [],
    exclude: [],
    ignore: [],
    ignoreRegex: [],
    files: [],
    secrets: false,
    ignoreUrls: [],
    json: false,
  };

  describe('Node.js Dot and Bracket Notation', () => {
    it('detects standard dot notation: process.env.MY_KEY', () => {
      const code = 'const val = process.env.MY_KEY;';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'process.env',
      });
    });

    it('detects bracket notation with double quotes: process.env["MY_KEY"]', () => {
      const code = 'const val = process.env["MY_KEY"];';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'process.env',
      });
    });

    it("detects bracket notation with single quotes: process.env['MY_KEY']", () => {
      const code = "const val = process.env['MY_KEY'];";
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'process.env',
      });
    });
  });

  describe('Node.js Destructuring', () => {
    it('detects simple destructuring: const { MY_KEY } = process.env', () => {
      const code = 'const { MY_KEY } = process.env;';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'process.env',
      });
    });

    it('detects aliased destructuring: const { MY_KEY: alias } = process.env', () => {
      const code = 'const { MY_KEY: alias } = process.env;';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'process.env',
      });
    });

    it('detects destructuring with default values: const { MY_KEY = "val" } = process.env', () => {
      const code = 'const { MY_KEY = "default" } = process.env;';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'process.env',
      });
    });

    it('detects multiple mixed destructuring', () => {
      const code =
        'const { MY_KEY, OTHER_KEY: alias, THIRD_KEY = "fallback" } = process.env;';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(3);
      const variables = result.map((u) => u.variable).sort();
      expect(variables).toEqual(['MY_KEY', 'OTHER_KEY', 'THIRD_KEY']);
    });

    it('detects multiline destructuring', () => {
      const code = `
        const { 
          MY_KEY, 
          OTHER_KEY 
        } = process.env;
      `;
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(2);
      const variables = result.map((u) => u.variable).sort();
      expect(variables).toEqual(['MY_KEY', 'OTHER_KEY']);
    });

    it('handles empty destructuring gracefully', () => {
      const code = 'const {} = process.env;';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(0);
    });

    it('handles complex whitespace and empty parts in destructuring', () => {
      const code = 'const { KEY_1, , KEY_2 } = process.env;';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.variable).sort()).toEqual(['KEY_1', 'KEY_2']);
    });
  });

  describe('import.meta.env Dot and Bracket Notation', () => {
    it('detects standard dot notation: import.meta.env.MY_KEY', () => {
      const code = 'const val = import.meta.env.MY_KEY;';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'import.meta.env',
      });
    });

    it('detects bracket notation with double quotes: import.meta.env["MY_KEY"]', () => {
      const code = 'const val = import.meta.env["MY_KEY"];';
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'import.meta.env',
      });
    });

    it("detects bracket notation with single quotes: import.meta.env['MY_KEY']", () => {
      const code = "const val = import.meta.env['MY_KEY'];";
      const result = scanFile('test.js', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'import.meta.env',
      });
    });
  });

  describe('Default include extensions', () => {
    it('includes .mts in default scan extensions', () => {
      expect(DEFAULT_INCLUDE_EXTENSIONS).toContain('.mts');
    });

    it('includes .cts in default scan extensions', () => {
      expect(DEFAULT_INCLUDE_EXTENSIONS).toContain('.cts');
    });

    it('includes all expected extensions', () => {
      expect(DEFAULT_INCLUDE_EXTENSIONS).toEqual(
        expect.arrayContaining([
          '.js',
          '.ts',
          '.jsx',
          '.tsx',
          '.vue',
          '.svelte',
          '.mjs',
          '.mts',
          '.cjs',
          '.cts',
        ]),
      );
    });

    it('will detect patterns in .mts files', () => {
      const code = 'const val = process.env.MY_KEY;';
      const result = scanFile('test.mts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'process.env',
      });
    });

    it('will detect patterns in .vue files', () => {
      const code = 'const val = import.meta.env.VITE_KEY;';
      const result = scanFile('component.vue', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ variable: 'VITE_KEY' });
    });

    it('will detect patterns in .svelte files', () => {
      const code = "import { MY_VAR } from '$env/static/private';";
      const result = scanFile('page.svelte', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ variable: 'MY_VAR' });
    });
  });

  describe('Default exclude patterns', () => {
    it('excludes node_modules', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('node_modules');
    });

    it('excludes dist', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('dist');
    });

    it('excludes build', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('build');
    });

    it('excludes test files by extension', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('.test.');
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('.spec.');
    });

    it('excludes __tests__ and __mocks__ directories', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('__tests__');
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('__mocks__');
    });

    it('excludes framework build dirs', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('.next');
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('.nuxt');
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('.sveltekit');
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('.svelte-kit');
    });

    it('excludes common fixture/sample paths', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('fixtures');
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('examples');
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('samples');
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('sandbox');
    });
  });

  describe('ENV_PATTERNS export', () => {
    it('exports an array', () => {
      expect(Array.isArray(ENV_PATTERNS)).toBe(true);
    });

    it('contains patterns for all three pattern names', () => {
      const names = ENV_PATTERNS.map((p) => p.name);
      expect(names).toContain('process.env');
      expect(names).toContain('import.meta.env');
      expect(names).toContain('sveltekit');
    });

    it('every pattern has a regex', () => {
      for (const p of ENV_PATTERNS) {
        expect(p.regex).toBeInstanceOf(RegExp);
      }
    });
  });

  describe('Processor branch coverage', () => {
    // Helper to build a minimal RegExpExecArray
    function makeMatch(
      fullMatch: string,
      ...groups: (string | undefined)[]
    ): RegExpExecArray {
      return Object.assign([fullMatch, ...groups], {
        index: 0,
        input: fullMatch,
      }) as unknown as RegExpExecArray;
    }

    it('process.env processor returns [] when both capture groups are undefined (line 31)', () => {
      const processor = ENV_PATTERNS.find(
        (p) => p.name === 'process.env' && p.regex.source.includes('\\['),
      )?.processor;
      expect(
        processor?.(makeMatch('process.env.', undefined, undefined)),
      ).toEqual([]);
    });

    it('process.env destructuring processor returns empty string for part starting with : (line 58)', () => {
      // `:ALIAS` splits to key='' which is falsy → returns '' → filtered out by uppercase check
      const code = 'const { :ALIAS } = process.env;';
      const result = scanFile('test.js', code, baseOpts);
      expect(result).toHaveLength(0);
    });

    it('import.meta.env processor returns [] when both capture groups are undefined (line 79)', () => {
      const processor = ENV_PATTERNS.find(
        (p) => p.name === 'import.meta.env',
      )?.processor;
      expect(
        processor?.(makeMatch('import.meta.env.', undefined, undefined)),
      ).toEqual([]);
    });

    it('env destructuring processor returns [] for empty braces: const {} = env (line 106)', () => {
      const code = 'const {} = env;';
      const result = scanFile('test.ts', code, baseOpts);
      expect(result).toHaveLength(0);
    });

    it('env destructuring processor returns empty string for part starting with : (line 117)', () => {
      // `:ALIAS` splits to key='' which is falsy → returns '' → filtered out by uppercase check
      const code = 'const { :ALIAS } = env;';
      const result = scanFile('test.ts', code, baseOpts);
      expect(result).toHaveLength(0);
    });
  });

  describe('Pattern edge cases', () => {
    it('does not detect lowercase process.env keys', () => {
      const code = 'const val = process.env.myKey;';
      const result = scanFile('test.js', code, baseOpts);
      expect(result).toHaveLength(0);
    });

    it('does not detect lowercase import.meta.env keys', () => {
      const code = 'const val = import.meta.env.myKey;';
      const result = scanFile('test.js', code, baseOpts);
      expect(result).toHaveLength(0);
    });

    it('does not match env.lowercase (sveltekit pattern requires uppercase)', () => {
      const code = 'const val = env.myKey;';
      const result = scanFile('test.ts', code, baseOpts);
      expect(result).toHaveLength(0);
    });

    it('detects keys with numbers: MY_KEY_123', () => {
      const code = 'const val = process.env.MY_KEY_123;';
      const result = scanFile('test.js', code, baseOpts);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ variable: 'MY_KEY_123' });
    });

    it('detects multiple keys on different lines', () => {
      const code = [
        'const a = process.env.KEY_ONE;',
        'const b = process.env.KEY_TWO;',
      ].join('\n');
      const result = scanFile('test.js', code, baseOpts);
      expect(result).toHaveLength(2);
      const variables = result.map((r) => r.variable).sort();
      expect(variables).toEqual(['KEY_ONE', 'KEY_TWO']);
    });
  });

  describe('SvelteKit Static Named Imports', () => {
    it('detects import from $env/static/private', () => {
      const code = "import { SECRET_KEY } from '$env/static/private';";
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'SECRET_KEY',
        pattern: 'sveltekit',
      });
    });

    it('detects import from $env/static/public', () => {
      const code = "import { PUBLIC_API_URL } from '$env/static/public';";
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'PUBLIC_API_URL',
        pattern: 'sveltekit',
      });
    });

    it('detects import with double quotes', () => {
      const code = 'import { SECRET_KEY } from "$env/static/private";';
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ variable: 'SECRET_KEY' });
    });
  });

  describe('SvelteKit Invalid Dynamic Named Imports', () => {
    it('detects invalid named import from $env/dynamic/private', () => {
      const code = "import { SECRET_KEY } from '$env/dynamic/private';";
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'SECRET_KEY',
        pattern: 'sveltekit',
      });
    });

    it('detects invalid named import from $env/dynamic/public', () => {
      const code = "import { PUBLIC_KEY } from '$env/dynamic/public';";
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'PUBLIC_KEY',
        pattern: 'sveltekit',
      });
    });
  });

  describe('SvelteKit Invalid Default Imports', () => {
    it('detects invalid default import from $env/static/private', () => {
      const code = "import SECRET_KEY from '$env/static/private';";
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'SECRET_KEY',
        pattern: 'sveltekit',
      });
    });

    it('detects invalid default import from $env/static/public', () => {
      const code = "import PUBLIC_URL from '$env/static/public';";
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'PUBLIC_URL',
        pattern: 'sveltekit',
      });
    });

    it('detects invalid default import from $env/dynamic/private', () => {
      const code = "import SECRET_KEY from '$env/dynamic/private';";
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'SECRET_KEY',
        pattern: 'sveltekit',
      });
    });
  });

  describe('buildSveltekitAliasPatterns', () => {
    function makeMatch(
      fullMatch: string,
      ...groups: (string | undefined)[]
    ): RegExpExecArray {
      return Object.assign([fullMatch, ...groups], {
        index: 0,
        input: fullMatch,
      }) as unknown as RegExpExecArray;
    }

    it('returns two patterns for a given alias', () => {
      const patterns = buildSveltekitAliasPatterns('privateEnv');
      expect(patterns).toHaveLength(2);
      expect(patterns[0]?.regex).toBeInstanceOf(RegExp);
      expect(patterns[1]?.regex).toBeInstanceOf(RegExp);
      expect(patterns.every((p) => p.name === 'sveltekit')).toBe(true);
    });

    it('dot notation pattern matches alias.VAR', () => {
      const [dotPattern] = buildSveltekitAliasPatterns('privateEnv');
      expect(dotPattern!.regex.test('privateEnv.MY_SECRET')).toBe(true);
      expect(dotPattern!.regex.test('env.MY_SECRET')).toBe(false);
    });

    it('destructuring processor returns [] for empty content (if !content branch)', () => {
      const [, destructurePattern] = buildSveltekitAliasPatterns('privateEnv');
      const result = destructurePattern!.processor!(makeMatch('{}', ''));
      expect(result).toEqual([]);
    });

    it('destructuring processor returns [] when content is undefined', () => {
      const [, destructurePattern] = buildSveltekitAliasPatterns('privateEnv');
      const result = destructurePattern!.processor!(makeMatch('{}', undefined));
      expect(result).toEqual([]);
    });

    it('destructuring processor returns empty string for part starting with : (key falsy branch)', () => {
      // ':ALIAS' splits to key='' which is falsy → '' → filtered by uppercase check
      const code = `import { env as privateEnv } from '$env/dynamic/private';
const { :ALIAS } = privateEnv;`;
      const result = scanFile('test.ts', code, baseOpts);
      expect(result).toHaveLength(0);
    });

    it('destructuring processor extracts multiple vars from aliased import', () => {
      const code = `import { env as privateEnv } from '$env/dynamic/private';
const { SECRET_KEY, API_TOKEN } = privateEnv;`;
      const result = scanFile('test.ts', code, baseOpts);
      expect(result.map((u) => u.variable).sort()).toEqual([
        'API_TOKEN',
        'SECRET_KEY',
      ]);
    });

    it('destructuring processor handles aliased keys: { VAR: alias } = privateEnv', () => {
      const code = `import { env as privateEnv } from '$env/dynamic/private';
const { SECRET_KEY: secret } = privateEnv;`;
      const result = scanFile('test.ts', code, baseOpts);
      expect(result).toHaveLength(1);
      expect(result[0]?.variable).toBe('SECRET_KEY');
    });
  });

  describe('SvelteKit env Object Access', () => {
    it('detects env.VARIABLE_NAME access', () => {
      const code = 'const token = env.KEYCLOAK_SECRET;';
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'KEYCLOAK_SECRET',
        pattern: 'sveltekit',
      });
    });

    it('detects destructuring from env: const { VAR1, VAR2 } = env', () => {
      const code = 'const { KEYCLOAK_URL, KEYCLOAK_REALM } = env;';
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(2);
      const variables = result.map((u) => u.variable).sort();
      expect(variables).toEqual(['KEYCLOAK_REALM', 'KEYCLOAK_URL']);
    });

    it('detects destructuring with aliasing: const { VAR: alias } = env', () => {
      const code = 'const { KEYCLOAK_URL: url } = env;';
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'KEYCLOAK_URL',
        pattern: 'sveltekit',
      });
    });

    it('detects destructuring with default values: const { VAR = "default" } = env', () => {
      const code = 'const { KEYCLOAK_URL = "http://localhost:8080" } = env;';
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'KEYCLOAK_URL',
        pattern: 'sveltekit',
      });
    });

    it('detects multiple mixed destructuring from env', () => {
      const code =
        'const { KEYCLOAK_URL, KEYCLOAK_REALM: realm, CLIENT_SECRET = "default" } = env;';
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(3);
      const variables = result.map((u) => u.variable).sort();
      expect(variables).toEqual([
        'CLIENT_SECRET',
        'KEYCLOAK_REALM',
        'KEYCLOAK_URL',
      ]);
    });

    it('detects multiline destructuring from env', () => {
      const code = `
        const { 
          KEYCLOAK_URL,
          KEYCLOAK_REALM,
          CLIENT_ID
        } = env;
      `;
      const result = scanFile('test.ts', code, baseOpts);

      expect(result).toHaveLength(3);
      const variables = result.map((u) => u.variable).sort();
      expect(variables).toEqual([
        'CLIENT_ID',
        'KEYCLOAK_REALM',
        'KEYCLOAK_URL',
      ]);
    });
  });
});
