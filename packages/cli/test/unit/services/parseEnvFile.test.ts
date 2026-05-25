import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseEnvFile } from '../../../src/services/parseEnvFile.js';

describe('parseEnvFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parse-env-file-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses a valid .env file into key-value pairs', () => {
    const file = path.join(tmpDir, '.env');
    fs.writeFileSync(file, 'API_KEY=abc123\nDB_HOST=localhost\n');

    expect(parseEnvFile(file)).toEqual({
      API_KEY: 'abc123',
      DB_HOST: 'localhost',
    });
  });

  it('returns an empty object for an empty file', () => {
    const file = path.join(tmpDir, '.env');
    fs.writeFileSync(file, '');

    expect(parseEnvFile(file)).toEqual({});
  });

  it('returns an empty object when the file does not exist', () => {
    const file = path.join(tmpDir, 'nonexistent.env');

    expect(parseEnvFile(file)).toEqual({});
  });

  it('preserves quoted values as-is (quotes are not stripped)', () => {
    const file = path.join(tmpDir, '.env');
    fs.writeFileSync(file, 'SECRET="my secret value"\n');

    expect(parseEnvFile(file)).toEqual({ SECRET: '"my secret value"' });
  });

  it('ignores comment lines', () => {
    const file = path.join(tmpDir, '.env');
    fs.writeFileSync(file, '# This is a comment\nKEY=value\n');

    expect(parseEnvFile(file)).toEqual({ KEY: 'value' });
  });

  it('handles keys with empty values', () => {
    const file = path.join(tmpDir, '.env');
    fs.writeFileSync(file, 'EMPTY=\n');

    expect(parseEnvFile(file)).toEqual({ EMPTY: '' });
  });
});
