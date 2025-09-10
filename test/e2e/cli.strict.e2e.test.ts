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

describe('--strict mode', () => {
  it('fails on unused variables', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'UNUSED=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), ''); // no usages

    const res = runCli(cwd, ['--strict']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('⚠️  Unused in codebase');
  });

  it('fails on duplicate variables in .env', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=1\nFOO=2\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=\n');

    const res = runCli(cwd, ['--strict']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('⚠️  Duplicate keys');
  });

  it('fails on duplicate variables in .env.example', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=\nFOO=\n');

    const res = runCli(cwd, ['--strict', '--example', '.env.example']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('⚠️  Duplicate keys in .env.example');
  });

  it('succeeds when there are no warnings', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), '');

    const res = runCli(cwd, ['--strict']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('✅');
  });
});

describe('--strict mode with --compare', () => {
  it('fails on duplicate variables in .env', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=1\nFOO=2\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=\n');

    const res = runCli(cwd, ['--strict', '--compare']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('⚠️  Duplicate keys');
  });

  it('fails on duplicate variables in .env.example', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=\nFOO=\n');

    const res = runCli(cwd, ['--strict', '--compare']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('⚠️  Duplicate keys in .env.example');
  });

  it('succeeds when there are no warnings', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=\n');

    const res = runCli(cwd, ['--strict', '--compare']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('✅');
  });
});
