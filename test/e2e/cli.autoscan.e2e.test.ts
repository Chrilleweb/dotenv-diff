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
    expect(res.stdout).not.toContain('Scan Statistics');
    expect(res.stdout).not.toContain('SECRET_KEY');
  });

  it('should warn about potential secret foound i .env.example', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      `const key = proccess.env.API_KEY`,
    );

    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      'API_KEY=sk_test_4eC39HqLyjWDarjtT1zdp7dc\n',
    );

    const res = runCli(cwd, ['--example', '.env.example', '--strict']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain(
      'Potential real secrets found in .env.example:',
    );
    expect(res.stdout).toContain('API_KEY');
  });
  it('should not warn about potential secret found in .env.example', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      `console.log('hello');`,
    );

    fs.writeFileSync(path.join(cwd, '.env.example'), 'API_KEY=EXAMPLE_KEY\n');

    const res = runCli(cwd, ['--example', '.env.example']);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain(
      'Potential real secrets found in .env.example:',
    );
  });

  it('exit code if potential real secrets found in .env.example is high', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      `const key = proccess.env.API_KEY`,
    );

    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      'API_KEY=sk_test_4eC39HqLyjWDarjtT1zdp7dc\n',
    );

    const res = runCli(cwd, ['--example', '.env.example']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain(
      'Potential real secrets found in .env.example:',
    );
    expect(res.stdout).toContain('[high]');
  });

  it('will ingore files with excludeFiles option in config', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, 'dotenv-diff.config.json'),
      JSON.stringify(
        {
          excludeFiles: ['src/ignore/**'],
        },
        null,
        2,
      ),
    );

    fs.mkdirSync(path.join(cwd, 'src', 'ignore'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'ignore', 'index.ts'),
      `const secret = "sk_test_4eC39HqLyjWDarjtT1zdp7dc";`,
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase');
  });

  it('excludes a single file using exclude option', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, 'dotenv-diff.config.json'),
      JSON.stringify(
        {
          exclude: ['src/secret.ts'],
        },
        null,
        2,
      ),
    );

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'secret.ts'),
      `const secret = "sk_live_123456789";`,
    );

    const res = runCli(cwd, []);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase');
    expect(res.status).toBe(0);
  });

  it('Will handle cross-platform / different path styles (MISSING)', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), '');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `const db = process.env.DATABASE_URL;`,
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('src/index.ts');
  });

  it('shows progress bar during scanning in non-json mode', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `const apiKey = process.env.API_KEY;`,
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);

    expect(res.stdout).toContain('🔍');
    expect(res.stdout).toMatch(/█|░/);

    expect(res.stdout).toContain('Scan Statistics');
  });

  it('does not render progress bar when --json is enabled', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `const apiKey = process.env.API_KEY;`,
    );

    const res = runCli(cwd, ['--json']);

    expect(res.status).toBe(0);

    expect(res.stdout).not.toContain('🔍');
    expect(res.stdout).not.toMatch(/█|░/);

    expect(res.stdout.trim().startsWith('{')).toBe(true);
  });
});
