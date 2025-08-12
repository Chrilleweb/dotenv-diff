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

describe('--ignore and --ignore-regex', () => {
  it('reports extra keys without ignore', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=1\nDEBUG=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'DEBUG=\n');
    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Extra keys');
    expect(res.stdout).toContain('API_KEY');
  });

  it('ignores keys listed via --ignore', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=1\nDEBUG=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'DEBUG=\n');
    const res = runCli(cwd, ['--ignore', 'API_KEY']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('All keys match');
    expect(res.stdout).not.toContain('API_KEY');
  });

  it('ignores keys matching --ignore-regex', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_TOKEN=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), '');
    const res = runCli(cwd, ['--ignore-regex', '^SECRET_']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('All keys match');
    expect(res.stdout).not.toContain('SECRET_TOKEN');
  });

  it('combines --ignore and --ignore-regex', () => {
    const cwd = tmpDir();
    fs.writeFileSync(
      path.join(cwd, '.env'),
      'API_KEY=1\nSECRET_TOKEN=1\n',
    );
    fs.writeFileSync(path.join(cwd, '.env.example'), '');
    const res = runCli(cwd, ['--ignore', 'API_KEY', '--ignore-regex', '^SECRET_']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('All keys match');
    expect(res.stdout).not.toContain('API_KEY');
    expect(res.stdout).not.toContain('SECRET_TOKEN');
  });

  it('fails on invalid regex', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=\n');
    const res = runCli(cwd, ['--ignore-regex', '[']);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('invalid --ignore-regex pattern');
  });
});
