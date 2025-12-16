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

describe('added .env to gitignore with --compare and --fix', () => {
  it('will warn about .env not ignored by .gitignore', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, '.git'));
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=test\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'API_KEY=test\n');

    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `const apiKey = process.env.API_KEY;`.trimStart(),
    );

    const res = runCli(cwd, ['--compare', '--fix']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Auto-fix applied:');
    expect(res.stdout).toContain('Added .env to .gitignore');
  });
});
