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

describe('Health Score', () => {
  it('shows 100 health score when project is clean', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'index.ts'), 'process.env.API_KEY;');

    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=test\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'API_KEY=\n');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain('💚 Project Health Score:');
    expect(res.stdout).toMatch(/100\/100/);
  });

  it('reduces score when missing variables exist', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'MISSING_KEY=\n');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      'console.log(process.env.MISSING_KEY);',
    );

    const res = runCli(cwd, ['--scan-usage']);

    // Missing variables reduce score → should be < 100
    expect(res.stdout).toContain('💛 Project Health Score:');
    expect(res.stdout).not.toMatch(/100\/100/);
  });

  it('reduces score heavily on high-severity secrets', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env.example'), 'SECRET=\n');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      'const key = sk_live_abcdefghijklmnopqrstuvwx;',
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain('💛 Project Health Score:');

    // High secrets should push score far down (<85)
    const match = res.stdout.match(/Health Score:\s.*?(\d{1,3})\/100/);
    expect(match).not.toBeNull();

    const score = Number(match![1]);
    expect(score).toBeLessThan(85);
  });

  it('reduces score when uppercase naming violations exist', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), 'invalidKey=123\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'invalidKey=\n');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain('Variables not using uppercase naming');
    expect(res.stdout).toContain('💚 Project Health Score:');

    const match = res.stdout.match(/(\d{1,3})\/100/);
    expect(match).not.toBeNull();

    const score = Number(match![1]);
    expect(score).toBeLessThan(100);
  });

  it('includes healthScore inside JSON output', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'index.ts'), 'process.env.GOOD;');

    fs.writeFileSync(path.join(cwd, '.env'), 'GOOD=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'GOOD=\n');

    const res = runCli(cwd, ['--scan-usage', '--json']);

    const json = JSON.parse(res.stdout);

    expect(json.healthScore).toBeDefined();
    expect(json.healthScore).toBe(100);
  });
});
