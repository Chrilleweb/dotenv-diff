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
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('.env is not ignored by Git');
  });

    it('will warn about .env not ignored by .gitignore --compare flag', () => {
      const cwd = tmpDir();
  
      fs.mkdirSync(path.join(cwd, '.git'));
      fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=test\n');
      fs.writeFileSync(path.join(cwd, '.env.example'), 'API_KEY=example\n');
  
      fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n');
  
      fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(cwd, 'src', 'index.ts'),
        `const apiKey = process.env.API_KEY;`.trimStart(),
      );
  
      const res = runCli(cwd, ['--compare']);  
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
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Added .env to .gitignore');
    
    const gitignore = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.env');
  });
it('will ignore <!-- dotenv-diff-ignore --> and block comments in .env files', () => {
  const cwd = tmpDir();

  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });

  // Skriv +page.svelte med både inline og blok-ignore
  fs.writeFileSync(
    path.join(cwd, 'src', '+page.svelte'),
    `
      // Inline ignore test
      const apiKey = process.env.API_KEY; <!-- dotEnv- difF-   igNore -->
      const secret = process.env.SECRET; // should be detected

      // Block ignore test
      <!-- dotenv-diff-ignore-start -->
      <p>Environment: "https://thisissecrethttpslasdasdasdasdasd.com"</p>
      <!-- dotenv-diff-ignore-end -->

      <p>Environment: "https://thisissecrethttpslasdasdasdasdasd.com"</p> <!-- dotenv-diff-ignore -->

      const visible = process.env.VISIBLE; // should be detected
    `.trim(),
  );

  const res = runCli(cwd, []);

  expect(res.status).toBe(0);
  expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
});
it('will respect ignoreUrls from dotenv-diff.config.json and skip matching HTTPS warnings', () => {
  const cwd = tmpDir();

  fs.writeFileSync(
    path.join(cwd, 'dotenv-diff.config.json'),
    JSON.stringify(
      {
        strict: false,
        example: '.env.example',
        ignore: ['NODE_ENV'],
        ignoreUrls: ['https://ingenfejl.com'],
      },
      null,
      2,
    ),
  );

  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, 'src', 'index.ts'),
    `const url = "https://ingenfejl.com";`,
  );

  const res = runCli(cwd, []);

  expect(res.status).toBe(0);
  expect(res.stdout).not.toContain('Potential secrets detected in codebase');
  expect(res.stdout).not.toContain('https://ingenfejl.com');
});
});
