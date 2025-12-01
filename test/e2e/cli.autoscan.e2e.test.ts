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
  it('--init will create a sample config file and do nothing else', () => {
    const cwd = tmpDir();

    const res = runCli(cwd, ['--init']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Created dotenv-diff.config.json');

    const configPath = path.join(cwd, 'dotenv-diff.config.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    expect(config).toEqual({
      strict: false,
      example: '.env.example',
      ignore: ['NODE_ENV', 'VITE_MODE'],
      ignoreUrls: ['https://example.com'],
    });
  });
  it('--init when config file already exists will do nothing and notify user', () => {
    const cwd = tmpDir();

    const configPath = path.join(cwd, 'dotenv-diff.config.json');
    fs.writeFileSync(configPath, '{}');

    const res = runCli(cwd, ['--init']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('dotenv-diff.config.json already exists');
  });
  it('will apply all options from dotenv-diff.config.json correctly', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, 'dotenv-diff.config.json'),
      JSON.stringify(
        {
          checkValues: true,
          ci: true,
          yes: true,
          allowDuplicates: true,
          fix: true,
          json: false,
          env: '.env',
          noCompare: false,
          example: '.env.example',
          ignore: ['NODE_ENV', 'VITE_MODE', 'SECRET_KEY'],
          ignoreRegex: ['^TEST_'],
          only: ['missing', 'extra'],
          compare: false,
          noColor: true,
          scanUsage: false,
          includeFiles: ['src/**/*.ts'],
          excludeFiles: ['**/*.spec.ts'],
          showUnused: false,
          showStats: false,
          files: ['src/specific.ts'],
          secrets: false,
          strict: false,
          ignoreUrls: ['https://ignoreme.com'],
        },
        null,
        2,
      ),
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=test\nSECRET_KEY=123\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'API_KEY=\nSECRET_KEY=\n');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'specific.ts'),
      `const url = "https://ignoreme.com";
     const api = process.env.API_KEY;
     const test = process.env.TEST_SHOULD_BE_IGNORED;`,
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Loaded');
  });

  it('warns about missing CSP when scanning codebase', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `const url = "https://example.com";`,
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('CSP is missing');
  });

  it('does not warn about CSP when CSP is present in codebase', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'self';">
      </head>
    `,
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('CSP is missing');
  });
});
