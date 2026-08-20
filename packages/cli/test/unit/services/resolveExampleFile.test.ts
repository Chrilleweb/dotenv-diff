import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { resolveExampleFile } from '../../../src/services/resolveExampleFile.js';

describe('resolveExampleFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-example-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (name: string): void => {
    fs.writeFileSync(path.join(dir, name), '');
  };

  /** Resolves for a file in the temp dir and returns the basename found. */
  const resolve = (envFile: string): string | null => {
    const found = resolveExampleFile(path.join(dir, envFile));
    return found === null ? null : path.basename(found);
  };

  it('pairs .env with the .env.example beside it', () => {
    write('.env.example');

    expect(resolve('.env')).toBe('.env.example');
  });

  it.each(['.env-example', '.env.sample', '.env.template'])(
    'accepts %s as the example file',
    (name) => {
      write(name);

      expect(resolve('.env')).toBe(name);
    },
  );

  it('prefers .env.example over the other accepted names', () => {
    write('.env.template');
    write('.env.sample');
    write('.env-example');
    write('.env.example');

    expect(resolve('.env')).toBe('.env.example');
  });

  it('prefers the suffix-matched example for a suffixed env file', () => {
    write('.env.example');
    write('.env.example.production');

    expect(resolve('.env.production')).toBe('.env.example.production');
  });

  it('falls back to the unsuffixed example when no suffixed one exists', () => {
    write('.env.example');

    expect(resolve('.env.production')).toBe('.env.example');
  });

  it('handles the dash separator in an env file name', () => {
    write('.env.example-local');

    expect(resolve('.env-local')).toBe('.env.example-local');
  });

  it('treats an example file as its own documentation', () => {
    write('.env.example');

    expect(resolve('.env.example')).toBe('.env.example');
  });

  it('treats a suffixed example file as its own documentation', () => {
    write('.env.sample.production');

    expect(resolve('.env.sample.production')).toBe('.env.sample.production');
  });

  it('returns null for an example file that does not exist', () => {
    expect(resolve('.env.example')).toBeNull();
  });

  it('returns null when the directory holds no example file', () => {
    write('.env');

    expect(resolve('.env')).toBeNull();
  });
});
