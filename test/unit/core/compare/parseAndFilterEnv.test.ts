import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseAndFilterEnv } from '../../../../src/core/compare/parseAndFilterEnv.js';
import type { ComparisonOptions } from '../../../../src/config/types.js';

describe('parseAndFilterEnv', () => {
  let tmpDir: string;
  let envPath: string;
  let examplePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
    envPath = path.join(tmpDir, '.env');
    examplePath = path.join(tmpDir, '.env.example');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses and returns both env files with all keys', () => {
    fs.writeFileSync(envPath, 'FOO=bar\nBAZ=qux\n');
    fs.writeFileSync(examplePath, 'FOO=\nBAZ=\nQUX=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ FOO: 'bar', BAZ: 'qux' });
    expect(result.example).toEqual({ FOO: '', BAZ: '', QUX: '' });
    expect(result.currentKeys).toEqual(['FOO', 'BAZ']);
    expect(result.exampleKeys).toEqual(['FOO', 'BAZ', 'QUX']);
  });

  it('filters keys based on ignore option', () => {
    fs.writeFileSync(envPath, 'FOO=bar\nBAZ=qux\nIGNORE_ME=secret\n');
    fs.writeFileSync(examplePath, 'FOO=\nBAZ=\nIGNORE_ME=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: ['IGNORE_ME'],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ FOO: 'bar', BAZ: 'qux' });
    expect(result.example).toEqual({ FOO: '', BAZ: '' });
    expect(result.currentKeys).toEqual(['FOO', 'BAZ']);
    expect(result.exampleKeys).toEqual(['FOO', 'BAZ']);
  });

  it('filters keys based on ignoreRegex option', () => {
    fs.writeFileSync(envPath, 'FOO=bar\nTEST_VAR=qux\nTEST_OTHER=value\n');
    fs.writeFileSync(examplePath, 'FOO=\nTEST_VAR=\nTEST_OTHER=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [/^TEST_/],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ FOO: 'bar' });
    expect(result.example).toEqual({ FOO: '' });
    expect(result.currentKeys).toEqual(['FOO']);
    expect(result.exampleKeys).toEqual(['FOO']);
  });

  it('filters keys with both ignore and ignoreRegex', () => {
    fs.writeFileSync(
      envPath,
      'FOO=bar\nIGNORED=1\nTEST_VAR=2\nKEEP=3\n',
    );
    fs.writeFileSync(
      examplePath,
      'FOO=\nIGNORED=\nTEST_VAR=\nKEEP=\n',
    );

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: ['IGNORED'],
      ignoreRegex: [/^TEST_/],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ FOO: 'bar', KEEP: '3' });
    expect(result.example).toEqual({ FOO: '', KEEP: '' });
    expect(result.currentKeys).toEqual(['FOO', 'KEEP']);
    expect(result.exampleKeys).toEqual(['FOO', 'KEEP']);
  });

  it('handles empty env files', () => {
    fs.writeFileSync(envPath, '');
    fs.writeFileSync(examplePath, '');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({});
    expect(result.example).toEqual({});
    expect(result.currentKeys).toEqual([]);
    expect(result.exampleKeys).toEqual([]);
  });

  it('handles comments and empty lines', () => {
    fs.writeFileSync(
      envPath,
      `# Comment
FOO=bar

# Another comment
BAZ=qux
`,
    );
    fs.writeFileSync(
      examplePath,
      `# Example file
FOO=

BAZ=
`,
    );

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ FOO: 'bar', BAZ: 'qux' });
    expect(result.example).toEqual({ FOO: '', BAZ: '' });
  });

  it('handles keys with different values in current vs example', () => {
    fs.writeFileSync(envPath, 'FOO=production\nBAR=123\n');
    fs.writeFileSync(examplePath, 'FOO=development\nBAR=456\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ FOO: 'production', BAR: '123' });
    expect(result.example).toEqual({ FOO: 'development', BAR: '456' });
  });

  it('handles keys only in current file', () => {
    fs.writeFileSync(envPath, 'FOO=bar\nEXTRA=value\n');
    fs.writeFileSync(examplePath, 'FOO=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ FOO: 'bar', EXTRA: 'value' });
    expect(result.example).toEqual({ FOO: '' });
    expect(result.currentKeys).toEqual(['FOO', 'EXTRA']);
    expect(result.exampleKeys).toEqual(['FOO']);
  });

  it('handles keys only in example file', () => {
    fs.writeFileSync(envPath, 'FOO=bar\n');
    fs.writeFileSync(examplePath, 'FOO=\nMISSING=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ FOO: 'bar' });
    expect(result.example).toEqual({ FOO: '', MISSING: '' });
    expect(result.currentKeys).toEqual(['FOO']);
    expect(result.exampleKeys).toEqual(['FOO', 'MISSING']);
  });

  it('handles multiline values', () => {
    fs.writeFileSync(envPath, 'FOO="line1\nline2"\nBAR=simple\n');
    fs.writeFileSync(examplePath, 'FOO=\nBAR=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.currentKeys).toContain('FOO');
    expect(result.currentKeys).toContain('BAR');
    expect(result.exampleKeys).toEqual(['FOO', 'BAR']);
  });

  it('handles special characters in values', () => {
    fs.writeFileSync(
      envPath,
      'URL=https://example.com?foo=bar&baz=qux\nPATH=/usr/local/bin\n',
    );
    fs.writeFileSync(examplePath, 'URL=\nPATH=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current.URL).toContain('https://');
    expect(result.current.PATH).toBe('/usr/local/bin');
  });

  it('handles keys with dots and hyphens', () => {
    fs.writeFileSync(envPath, 'FOO.BAR=value1\nBAZ-QUX=value2\n');
    fs.writeFileSync(examplePath, 'FOO.BAR=\nBAZ-QUX=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current['FOO.BAR']).toBe('value1');
    expect(result.current['BAZ-QUX']).toBe('value2');
  });

  it('filters all keys when all match ignore patterns', () => {
    fs.writeFileSync(envPath, 'TEST_1=a\nTEST_2=b\n');
    fs.writeFileSync(examplePath, 'TEST_1=\nTEST_2=\n');

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: [],
      ignoreRegex: [/^TEST_/],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({});
    expect(result.example).toEqual({});
    expect(result.currentKeys).toEqual([]);
    expect(result.exampleKeys).toEqual([]);
  });

  it('handles complex ignore patterns', () => {
    fs.writeFileSync(
      envPath,
      'API_KEY=secret\nAPI_URL=url\nDB_HOST=host\nDB_PORT=5432\n',
    );
    fs.writeFileSync(
      examplePath,
      'API_KEY=\nAPI_URL=\nDB_HOST=\nDB_PORT=\n',
    );

    const opts: ComparisonOptions = {
      checkValues: false,
      cwd: tmpDir,
      ignore: ['DB_PORT'],
      ignoreRegex: [/^API_KEY/],
    };

    const result = parseAndFilterEnv(envPath, examplePath, opts);

    expect(result.current).toEqual({ API_URL: 'url', DB_HOST: 'host' });
    expect(result.example).toEqual({ API_URL: '', DB_HOST: '' });
  });
});
