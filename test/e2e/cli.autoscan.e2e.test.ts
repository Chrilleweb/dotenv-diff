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

describe('no-flag autoscan', () => {
  it('compares multiple env pairs and reports missing keys', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\nB=1\n');

    const res = runCli(cwd, ['--compare']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Comparing .env ↔ .env.example');
    expect(res.stdout).toContain(
      'Comparing .env.staging ↔ .env.example.staging',
    );
    expect(res.stdout).toContain('Missing keys');
  });
  it('will warn about .env not ignored by .gitignore', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, '.git'));
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=test\n');

    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `const apiKey = process.env.API_KEY;`.trimStart(),
    );

    const res = runCli(cwd, []);
    console.log('stdout:', res.stdout);
    console.log('stderr:', res.stderr);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('.env is not ignored by Git');
  });
  it('will auto-fix .env not ignored by .gitignore with --fix', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, '.git'));
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=test\n');

    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `const apiKey = process.env.API_KEY;`.trimStart(),
    );

    const res = runCli(cwd, ['--fix']);
    console.log();
    console.log('stdout:', res.stdout);
    console.log('stderr:', res.stderr);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Added .env ignore rules to .gitignore');
    
    const gitignore = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.*');
  });
});
