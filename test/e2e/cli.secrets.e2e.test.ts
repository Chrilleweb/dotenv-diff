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

describe('secrets detection (default scan mode)', () => {
  it('warns on provider-like tokens and high-entropy literals (no CI break)', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=\nNEW_API_KEY=\n');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // kendt mønster: GitHub PAT
      const gh = "ghp_1234567890ABCDEFGHijklmnopqrstuvwxYZ";

      // høj entropi & lang literal
      const password = "3fg400asipkfoemkfmojwpajwmdklaosjfiop";

      // lidt brug af env så stats/scan virker
      console.log(process.env.API_KEY, process.env.NEW_API_KEY);
    `.trimStart()
    );

    const local = runCli(cwd, []);
    expect(local.status).toBe(0);
    expect(local.stdout).toContain('Potential secrets detected in codebase:');
    expect(local.stdout).toContain('src/index.ts');

    const ci = runCli(cwd, ['--ci']);
    expect(ci.status).toBe(0);
    expect(ci.stdout).toContain('Potential secrets detected in codebase:');
  });

  it('does not warn on URLs like localhost (noise guard)', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), '\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // URL skal ikke flagges
      const service = 'http://localhost:3000';
      // kort literal skal ikke flagges
      const token = "12345";
      console.log(service, token);
    `.trimStart()
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });

  it('does not warn when no secrets are present', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // helt harmløst
      const a = "hello";
      console.log(a);
    `.trimStart()
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });
});
