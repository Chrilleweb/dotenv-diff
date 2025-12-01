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

describe('SvelteKit environment variable usage', () => {
    it('warns when using public variable without VITE_ prefix', () => {
    const cwd = tmpDir();
    fs.mkdirSync(path.join(cwd, 'src/routes'), { recursive: true });

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.ts'),
      `console.log(import.meta.env.PUBLIC_URL);`
    );

    fs.writeFileSync(path.join(cwd, '.env'), `PUBLIC_URL=https://example.com`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0); // warning only
    expect(res.stdout).toMatch(/Variables accessed through import.meta.env must start with/);
    expect(res.stdout).toMatch(/PUBLIC_URL/);
    expect(res.stdout).toMatch(/must start with "VITE_"/);
  });

  it('does not warn when VITE_ prefix is used correctly', () => {
    const cwd = tmpDir();
    fs.mkdirSync(path.join(cwd, 'src/routes'), { recursive: true });

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.ts'),
      `console.log(import.meta.env.VITE_PUBLIC_URL);`
    );

    fs.writeFileSync(path.join(cwd, '.env'), `VITE_PUBLIC_URL=https://example.com`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toMatch(/SvelteKit environment variable issues/);
  });
});
