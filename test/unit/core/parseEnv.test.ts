import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseEnvFile } from '../../../src/core/parseEnv.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
}

describe('parseEnvFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = tmpDir();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('parses a valid .env file', () => {
    const envPath = path.join(dir, '.env');

    fs.writeFileSync(
      envPath,
      `
# comment
FOO=bar
EMPTY=
WITH_EQUALS=a=b=c
SPACED= hello world 
`.trim(),
    );

    const result = parseEnvFile(envPath);

    expect(result).toEqual({
      FOO: 'bar',
      EMPTY: '',
      WITH_EQUALS: 'a=b=c',
      SPACED: 'hello world',
    });
  });

  it('returns empty object when file does not exist (optional .env)', () => {
    const envPath = path.join(dir, '.env');

    const result = parseEnvFile(envPath);

    expect(result).toEqual({});
  });

  it('returns empty object when path is a directory', () => {
    const result = parseEnvFile(dir);

    expect(result).toEqual({});
  });
  it('handles keys with whitespace correctly', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, '  KEY  =value');

    const result = parseEnvFile(envPath);
    expect(result).toEqual({ KEY: 'value' });
  });

  it('ignores lines without = sign', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, 'INVALID_LINE\nVALID=yes');

    const result = parseEnvFile(envPath);
    expect(result).toEqual({ VALID: 'yes' });
  });

  it('handles Windows line endings (CRLF)', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, 'KEY=value\r\n');

    const result = parseEnvFile(envPath);
    expect(result).toEqual({ KEY: 'value' });
  });

  it('handles empty file', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, '');

    const result = parseEnvFile(envPath);
    expect(result).toEqual({});
  });
  it('handles multiple comment styles', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      `# Full line comment
KEY=value
  # Indented comment
ANOTHER=test`,
    );

    const result = parseEnvFile(envPath);
    expect(result).toEqual({ KEY: 'value', ANOTHER: 'test' });
  });

  it('handles inline comments (currently NOT supported)', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, 'KEY=value # inline comment');

    const result = parseEnvFile(envPath);
    expect(result).toEqual({ KEY: 'value # inline comment' });
  });

  it('handles duplicate keys (last one wins)', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      `KEY=first
KEY=second
KEY=third`,
    );

    const result = parseEnvFile(envPath);
    expect(result).toEqual({ KEY: 'third' });
  });

  it('handles special characters in values', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      `URL=https://example.com?foo=bar&baz=qux
PATH=/usr/local/bin:/usr/bin
SPECIAL=!@#$%^&*()`,
    );

    const result = parseEnvFile(envPath);
    expect(result).toEqual({
      URL: 'https://example.com?foo=bar&baz=qux',
      PATH: '/usr/local/bin:/usr/bin',
      SPECIAL: '!@#$%^&*()',
    });
  });

  it('handles keys with numbers and underscores', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      `API_KEY_123=secret
_PRIVATE=value
KEY2=test`,
    );

    const result = parseEnvFile(envPath);
    expect(result).toEqual({
      API_KEY_123: 'secret',
      _PRIVATE: 'value',
      KEY2: 'test',
    });
  });

  it('handles quoted values (currently treated as literal quotes)', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      `SINGLE='single quotes'
DOUBLE="double quotes"
MIXED='mixed"quotes'`,
    );

    const result = parseEnvFile(envPath);
    expect(result).toEqual({
      SINGLE: "'single quotes'",
      DOUBLE: '"double quotes"',
      MIXED: "'mixed\"quotes'",
    });
  });

  it('handles only whitespace lines', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      `KEY=value
   
		
ANOTHER=test`,
    );

    const result = parseEnvFile(envPath);
    expect(result).toEqual({ KEY: 'value', ANOTHER: 'test' });
  });

  it('handles equal sign at start of line', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, '=value\nKEY=valid');

    const result = parseEnvFile(envPath);
    expect(result).toEqual({ KEY: 'valid' });
  });

  it('handles very long values', () => {
    const envPath = path.join(dir, '.env');
    const longValue = 'a'.repeat(10000);
    fs.writeFileSync(envPath, `LONG=${longValue}`);

    const result = parseEnvFile(envPath);
    expect(result.LONG).toBe(longValue);
    expect(result.LONG.length).toBe(10000);
  });

  it('handles Unicode characters', () => {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, 'EMOJI=🚀\nDANISH=æøå\nCHINESE=你好', 'utf-8');

    const result = parseEnvFile(envPath);
    expect(result).toEqual({
      EMOJI: '🚀',
      DANISH: 'æøå',
      CHINESE: '你好',
    });
  });
});
