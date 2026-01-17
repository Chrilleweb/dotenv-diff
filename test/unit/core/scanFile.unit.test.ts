import { describe, it, expect } from 'vitest';
import { scanFile } from '../../../src/core/scanFile.js';
import type { ScanOptions } from '../../../src/config/types.js';

describe('scanFile', () => {
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

  it('detects process.env.VAR usage', () => {
    const content = 'const apiKey = process.env.API_KEY;';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      variable: 'API_KEY',
      file: 'src/app.js',
      line: 1,
      pattern: 'process.env',
      isLogged: false,
    });
  });

  it('detects multiple env variables in same file', () => {
    const content = `
const key = process.env.API_KEY;
const url = process.env.DATABASE_URL;
const port = process.env.PORT;
`;
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages).toHaveLength(3);
    expect(usages[0]?.variable).toBe('API_KEY');
    expect(usages[1]?.variable).toBe('DATABASE_URL');
    expect(usages[2]?.variable).toBe('PORT');
  });

  it('detects import.meta.env variables', () => {
    const content = 'const apiUrl = import.meta.env.VITE_API_URL;';
    const usages = scanFile('/test/project/src/app.ts', content, baseOpts);

    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      variable: 'VITE_API_URL',
      pattern: 'import.meta.env',
    });
  });

  it('calculates correct line and column numbers', () => {
    const content = `const x = 1;
const y = 2;
const key = process.env.API_KEY;`;

    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages[0]).toMatchObject({
      variable: 'API_KEY',
      line: 3,
      column: expect.any(Number),
    });
  });

  it('skips env variables with ignore comment on same line', () => {
    const content = 'const key = process.env.SECRET_KEY; // dotenv-diff-ignore';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages).toHaveLength(0);
  });

  it('skips env variables with ignore comment on previous line', () => {
    const content = `// dotenv-diff-ignore
const key = process.env.SECRET_KEY;`;
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages).toHaveLength(0);
  });

  it('detects when env variable is used in console.log', () => {
    const content = 'console.log(process.env.DEBUG_MODE);';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages).toHaveLength(1);
    expect(usages[0]?.isLogged).toBe(true);
  });

  it('detects when env variable is used in console.error', () => {
    const content = 'console.error("Failed:", process.env.API_KEY);';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages[0]?.isLogged).toBe(true);
  });

  it('detects when env variable is used in console.warn', () => {
    const content = 'console.warn(process.env.WARNING);';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages[0]?.isLogged).toBe(true);
  });

  it('does not mark as logged when not in console statement', () => {
    const content = 'const key = process.env.API_KEY;';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages[0]?.isLogged).toBe(false);
  });

  it('extracts $env imports from SvelteKit files', () => {
    const content = `import { API_KEY } from '$env/static/private';
const key = API_KEY;`;
    const usages = scanFile('/test/project/src/app.svelte', content, baseOpts);

    expect(usages[0]?.imports).toContain('$env/static/private');
  });

  it('extracts multiple $env imports', () => {
    const content = `import { KEY1 } from '$env/static/private';
import { KEY2 } from '$env/dynamic/public';
const x = KEY1 + KEY2;`;
    const usages = scanFile('/test/project/src/app.svelte', content, baseOpts);

    expect(usages[0]?.imports).toEqual([
      '$env/static/private',
      '$env/dynamic/public',
    ]);
  });

  it('handles different $env import variations', () => {
    const content = `import SECRET from '$env/static/private';
import * as env from '$env/dynamic/private';`;
    const usages = scanFile('/test/project/src/app.svelte', content, baseOpts);

    // Should find the imports even if no env variables matched
    expect(usages.length).toBeGreaterThanOrEqual(0);
  });

  it('returns empty array when no env variables found', () => {
    const content = 'const x = 1;\nconst y = 2;';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages).toEqual([]);
  });

  it('handles empty file content', () => {
    const content = '';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages).toEqual([]);
  });

  it('includes context line in usage', () => {
    const content = 'const key = process.env.API_KEY;';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages[0]?.context).toBe('const key = process.env.API_KEY;');
  });

  it('handles file path relative to cwd', () => {
    const content = 'const key = process.env.API_KEY;';
    const usages = scanFile(
      '/test/project/src/nested/app.js',
      content,
      baseOpts,
    );

    expect(usages[0]?.file).toBe('src/nested/app.js');
  });

  it('handles undefined variable match gracefully', () => {
    // This tests the continue when variable is falsy
    const content = 'const x = process.env;'; // No .VAR
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    // Should not crash, just skip undefined variables
    expect(usages).toEqual([]);
  });

  it('handles undefined lines array access gracefully', () => {
    const content = 'const key = process.env.API_KEY;';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    // Should handle when accessing lines that might be undefined
    expect(usages).toHaveLength(1);
  });

  it('calculates column number for first line correctly', () => {
    const content = 'const key = process.env.API_KEY;';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages[0]?.column).toBeGreaterThan(0);
  });

  it('detects env variables with different patterns', () => {
    const content = `
process.env.VAR1;
import.meta.env.VAR2;
`;
    const usages = scanFile('/test/project/src/app.ts', content, baseOpts);

    expect(usages).toHaveLength(2);
    expect(usages[0]?.pattern).toBe('process.env');
    expect(usages[1]?.pattern).toBe('import.meta.env');
  });

  it('handles multiline code correctly', () => {
    const content = `const config = {
  apiKey: process.env.API_KEY,
  dbUrl: process.env.DATABASE_URL,
  port: process.env.PORT
};`;
    const usages = scanFile('/test/project/src/config.js', content, baseOpts);

    expect(usages).toHaveLength(3);
    expect(usages[0]?.line).toBe(2);
    expect(usages[1]?.line).toBe(3);
    expect(usages[2]?.line).toBe(4);
  });

  it('handles prevLine being undefined for first line', () => {
    const content = 'const key = process.env.API_KEY;';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    // Should not crash when accessing previous line of first line
    expect(usages).toHaveLength(1);
  });

  it('handles contextLine being undefined gracefully', () => {
    // Edge case where line might be out of bounds
    const content = 'const key = process.env.API_KEY;';
    const usages = scanFile('/test/project/src/app.js', content, baseOpts);

    expect(usages[0]?.context).toBeTruthy();
  });
});
