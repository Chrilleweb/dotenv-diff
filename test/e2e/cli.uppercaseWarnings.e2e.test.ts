import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { makeTmpDir, rmrf } from '../utils/fs-helpers.js';
import { buildOnce, runCli, cleanupBuild } from '../utils/cli-helpers.js';

const tmpDirs: string[] = [];

beforeAll(() => {
  buildOnce();
});

afterAll(() => {
  cleanupBuild();
});

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) rmrf(dir);
  }
});

function tmpDir() {
  const dir = makeTmpDir();
  tmpDirs.push(dir);
  return dir;
}

describe('Uppercase Warnings', () => {
  it('warns when env variable names are not uppercase', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), `api_key=123`);

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Variables not using uppercase naming');
    expect(res.stdout).toContain('api_key');
    expect(res.stdout).toContain('Consider naming it: API_KEY');
  });

  it('does not warn when variable key is already uppercase', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), `API_KEY=123`);

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Variables not using uppercase naming');
    expect(res.stdout).not.toContain('Consider naming it');
  });

  it('exits with error in strict mode when non-uppercase env vars are used', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), `api_key=123`);

    const res = runCli(cwd, ['--strict']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Variables not using uppercase naming');
    expect(res.stdout).toContain('api_key');
    expect(res.stdout).toContain('Consider naming it: API_KEY');
  });

  it('does not warn about uppercase when --no-uppercase-keys is not enabled', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), `api_key=123`);

    const res = runCli(cwd, ['--no-uppercase-keys']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Variables not using uppercase naming');
  });
});
