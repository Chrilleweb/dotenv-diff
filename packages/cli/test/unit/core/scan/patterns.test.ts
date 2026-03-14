import { describe, it, expect } from 'vitest';
import { scanFile } from '../../../../src/core/scan/scanFile';
import { DEFAULT_INCLUDE_EXTENSIONS } from '../../../../src/core/scan/patterns';
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

    it('will detect patterns in .mts files', () => {
      const code = 'const val = process.env.MY_KEY;';
      const result = scanFile('test.mts', code, baseOpts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variable: 'MY_KEY',
        pattern: 'process.env',
      });
    });
  });
});
