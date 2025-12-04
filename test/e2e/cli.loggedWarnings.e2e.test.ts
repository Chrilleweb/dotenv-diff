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

function makeProject(cwd: string) {
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      name: "test-project",
      devDependencies: {
        "@sveltejs/kit": "1.0.0"
      }
    }),
  );

  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
}

describe('Environment variable console.log detection', () => {

  it('warns when environment variables are logged using console.log', () => {
    const cwd = tmpDir();
    makeProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/index.ts'),
      `console.log(process.env.API_URL);
       const x = 1;`
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'API_URL=https://example.com');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Environment variables logged to console:');
    expect(res.stdout).toContain('API_URL');
    expect(res.stdout).toContain('Logged at:');
  });

  it('warns when multiple env vars are logged', () => {
    const cwd = tmpDir();
    makeProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app.ts'),
      `
      console.log(process.env.SECRET_KEY);
      console.warn(import.meta.env.VITE_PUBLIC_URL);
      `
    );

    fs.writeFileSync(
      path.join(cwd, '.env'),
      'SECRET_KEY=1\nVITE_PUBLIC_URL=2'
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SECRET_KEY');
    expect(res.stdout).toContain('VITE_PUBLIC_URL');
    expect(res.stdout).toContain('Environment variables logged to console');
  });

  it('does not warn if env vars are NOT logged', () => {
    const cwd = tmpDir();
    makeProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/no-log.ts'),
      `const x = process.env.SECRET_KEY;`
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_KEY=1');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).not.toContain('Environment variables logged to console');
  });

  it('shows up to 3 locations and summarizes additional ones', () => {
    const cwd = tmpDir();
    makeProject(cwd);

    const file1 = path.join(cwd, 'src/a.ts');
    const file2 = path.join(cwd, 'src/b.ts');
    const file3 = path.join(cwd, 'src/c.ts');
    const file4 = path.join(cwd, 'src/d.ts');

    fs.writeFileSync(file1, `console.log(process.env.DEBUG_FLAG)`);
    fs.writeFileSync(file2, `console.error(process.env.DEBUG_FLAG)`);
    fs.writeFileSync(file3, `console.info(process.env.DEBUG_FLAG)`);
    fs.writeFileSync(file4, `console.warn(process.env.DEBUG_FLAG)`);

    fs.writeFileSync(path.join(cwd, '.env'), 'DEBUG_FLAG=1');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain('DEBUG_FLAG');

    // Should show 3 locations, but summarize the 4th
    expect(res.stdout).toContain('... and 1 more locations');
  });

  it('strict mode: exits with code 1 when logs are found', () => {
    const cwd = tmpDir();
    makeProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/page.ts'),
      `console.log(process.env.PASSWORD);`
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PASSWORD=abc');

    const res = runCli(cwd, ['--scan-usage', '--strict']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Environment variables logged to console');
    expect(res.stdout).toContain('PASSWORD');
  });

  it('Will not warn if skip comment is present', () => {
    const cwd = tmpDir();
    makeProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/skip-log.ts'),
      `// dotenv-diff-ignore
       console.log(process.env.SKIPPED_VAR);`
    );
    fs.writeFileSync(path.join(cwd, '.env'), 'SKIPPED_VAR=shouldnotshow');

    const res = runCli(cwd, ['--scan-usage']);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Environment variables logged to console');
  });
});
