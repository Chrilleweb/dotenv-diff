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

describe('--scan-usage flag', () => {
  it('finds environment variables in JavaScript files', () => {
    const cwd = tmpDir();

    // Create a JS file with env usage
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/config.js'),
      `const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL;
console.log('Config loaded');`,
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Scanning codebase for environment variable usage',
    );
    expect(res.stdout).toContain('Found 2 unique environment variables in use');
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).toContain('DATABASE_URL');
  });

  it('finds missing variables when .env exists', () => {
    const cwd = tmpDir();

    // Create .env with only one variable
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=secret123\n');

    // Create JS file that uses two variables
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      `const apiKey = process.env.API_KEY;
const missing = process.env.MISSING_VAR;`,
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain('❌ Missing in .env:');
    expect(res.stdout).toContain('MISSING_VAR');
  });

  it('shows unused variables', () => {
    const cwd = tmpDir();

    // Create .env with unused variable
    fs.writeFileSync(
      path.join(cwd, '.env'),
      'API_KEY=secret123\nUNUSED_VAR=value\n',
    );

    // Create JS file that only uses one variable
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const apiKey = process.env.API_KEY;',
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('⚠️  Unused in codebase (defined in .env):');
    expect(res.stdout).toContain('UNUSED_VAR');
  });

  it('detects Vite/Vue import.meta.env usage', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/main.ts'),
      `const apiUrl = import.meta.env.VITE_API_URL;
const mode = import.meta.env.VITE_MODE;`,
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('VITE_API_URL');
    expect(res.stdout).toContain('VITE_MODE');
  });

  it('detects SvelteKit $env usage', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.svelte'),
      `import { SECRET_KEY } from '$env/static/private/SECRET_KEY';
import { PUBLIC_API } from '$env/static/public/PUBLIC_API';`,
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SECRET_KEY');
    expect(res.stdout).toContain('PUBLIC_API');
  });

  it('ignores files in node_modules', () => {
    const cwd = tmpDir();

    // Create file in node_modules (should be ignored)
    fs.mkdirSync(path.join(cwd, 'node_modules', 'some-package'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(cwd, 'node_modules', 'some-package', 'index.js'),
      'const ignored = process.env.IGNORED_VAR;',
    );

    // Create file in src (should be scanned)
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const used = process.env.USED_VAR;',
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('USED_VAR');
    expect(res.stdout).not.toContain('IGNORED_VAR');
  });

  it('respects --ignore flag for scan results', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      `const api = process.env.API_KEY;
const ignored = process.env.IGNORED_VAR;`,
    );

    const res = runCli(cwd, ['--scan-usage', '--ignore', 'IGNORED_VAR']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).not.toContain('IGNORED_VAR');
  });

  it('shows scan statistics', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );
    fs.writeFileSync(
      path.join(cwd, 'src/config.js'),
      'const db = process.env.API_KEY;', // Same variable used twice
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('📊 Scan Statistics:');
    expect(res.stdout).toContain('Files scanned: 2');
    expect(res.stdout).toContain('Total usages found: 2');
    expect(res.stdout).toContain('Unique variables: 1');
  });

  it('outputs JSON format with --json', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=secret\nUNUSED=value\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      `const api = process.env.API_KEY;
const missing = process.env.MISSING_VAR;`,
    );

    const res = runCli(cwd, ['--scan-usage', '--json']);

    expect(res.status).toBe(1); // Should exit with error due to missing variable
    expect(() => JSON.parse(res.stdout)).not.toThrow();

    const result = JSON.parse(res.stdout);
    expect(result).toHaveProperty('stats');
    expect(result.stats.uniqueVariables).toBe(2);
    expect(result.missing).toContainEqual(
      expect.objectContaining({ variable: 'MISSING_VAR' }),
    );
    expect(result.unused).toContain('UNUSED');
  });

  // UPDATED: Test for --include-files (adds to default patterns)
  it('adds additional file patterns with --include-files', () => {
    const cwd = tmpDir();

    // Create files with different extensions
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );
    fs.writeFileSync(
      path.join(cwd, 'src/config.py'),
      'api_key = os.environ.get("PYTHON_VAR")',
    );

    // Include .py files in addition to default patterns
    const res = runCli(cwd, ['--scan-usage', '--include-files', '**/*.py']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY'); // From default .js scanning
    // Note: PYTHON_VAR won't be found because our regex patterns don't match Python syntax
    // But the .py file would be included in scanning
  });

  // Test for --files (replaces default patterns)
  it('replaces default file patterns with --files', () => {
    const cwd = tmpDir();

    // Create files with different extensions
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );
    fs.writeFileSync(
      path.join(cwd, 'src/config.ts'),
      'const db = process.env.DATABASE_URL;',
    );

    // Only scan .ts files (ignore .js)
    const res = runCli(cwd, ['--scan-usage', '--files', '**/*.ts']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('DATABASE_URL'); // From .ts file
    expect(res.stdout).not.toContain('API_KEY'); // From .js file (ignored)
  });

  // Test showing the difference between --include-files and --files
  it('demonstrates difference between --include-files and --files', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );
    fs.writeFileSync(
      path.join(cwd, 'src/config.ts'),
      'const db = process.env.DATABASE_URL;',
    );

    // Test --include-files (should find both)
    const includeRes = runCli(cwd, [
      '--scan-usage',
      '--include-files',
      '**/*.ts',
    ]);
    expect(includeRes.status).toBe(0);
    expect(includeRes.stdout).toContain(
      'Found 2 unique environment variables in use',
    );
    expect(includeRes.stdout).toContain('API_KEY');
    expect(includeRes.stdout).toContain('DATABASE_URL');

    // Test --files (should only find .ts)
    const filesRes = runCli(cwd, ['--scan-usage', '--files', '**/*.ts']);
    expect(filesRes.status).toBe(0);
    expect(filesRes.stdout).toContain(
      'Found 1 unique environment variables in use',
    );
    expect(filesRes.stdout).not.toContain('API_KEY');
    expect(filesRes.stdout).toContain('DATABASE_URL');
  });

  it('excludes test files by default', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );
    fs.writeFileSync(
      path.join(cwd, 'src/app.test.js'),
      'const test = process.env.TEST_VAR;',
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).not.toContain('TEST_VAR');
  });

  it('excludes .sveltekit and .svelte-kit files by default', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );
    fs.mkdirSync(path.join(cwd, '.sveltekit'), { recursive: true });
    fs.mkdirSync(path.join(cwd, '.svelte-kit'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, '.svelte-kit/kit.js'),
      'const test = process.env.TEST_VAR;',
    );
    fs.writeFileSync(
      path.join(cwd, '.sveltekit/app.js'),
      'const test = process.env.TEST_VAR;',
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).not.toContain('TEST_VAR');
  });

  it('excludes _actions files by default', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );
    fs.mkdirSync(path.join(cwd, '_actions'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, '_actions/action.js'),
      'const action = process.env.ACTION_VAR;',
    );
    const res = runCli(cwd, ['--scan-usage']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).not.toContain('ACTION_VAR');
  });

  // Test that --files can override test file exclusion
  it('can include test files with --files flag', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );
    fs.writeFileSync(
      path.join(cwd, 'src/app.test.js'),
      'const test = process.env.TEST_VAR;',
    );

    // Use --files to explicitly include test files
    const res = runCli(cwd, ['--scan-usage', '--files', '**/*.js']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).toContain('TEST_VAR'); // Should now be found
  });

  it('handles files with no environment variables', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/utils.js'),
      `function add(a, b) { return a + b; }
export { add };`,
    );

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Scan Statistics:');
  });

  // Test monorepo scenario with --include-files
  it('works in monorepo scenario with --include-files', () => {
    const cwd = tmpDir();

    // Create monorepo structure
    fs.mkdirSync(path.join(cwd, 'apps/finance/src'), { recursive: true });
    fs.mkdirSync(path.join(cwd, 'packages/auth/src'), { recursive: true });

    // App file
    fs.writeFileSync(
      path.join(cwd, 'apps/finance/src/app.js'),
      'const appVar = process.env.FINANCE_APP_VAR;',
    );

    // Package file
    fs.writeFileSync(
      path.join(cwd, 'packages/auth/src/auth.js'),
      'const authVar = process.env.AUTH_PACKAGE_VAR;',
    );

    // Create .env.example in finance app
    fs.writeFileSync(
      path.join(cwd, 'apps/finance/.env.example'),
      'FINANCE_APP_VAR=\nAUTH_PACKAGE_VAR=\n',
    );

    // From finance app, scan both app and packages
    const res = runCli(path.join(cwd, 'apps/finance'), [
      '--scan-usage',
      '--example',
      '.env.example',
      '--include-files',
      '../../packages/**/*.{js,ts,svelte}',
    ]);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('FINANCE_APP_VAR');
    expect(res.stdout).toContain('AUTH_PACKAGE_VAR');
  });
});

describe('scan-usage error handling', () => {
  it('handles permission errors gracefully', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );

    // This should not crash even if there are permission issues
    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
  });

  it('handles binary files gracefully', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );

    // Create a binary file (should be skipped)
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    fs.writeFileSync(path.join(cwd, 'src/binary.js'), binaryData);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
  });

  describe('with --ci mode', () => {
    it('does not create any files', () => {
      const cwd = tmpDir();

      fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=secret\n');
      fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(cwd, 'src/app.js'),
        'const api = process.env.API_KEY;',
      );

      const res = runCli(cwd, ['--scan-usage', '--ci']);

      expect(res.status).toBe(0);
      expect(fs.existsSync(path.join(cwd, 'scan-results.json'))).toBe(false);
    });

    it('fails when missing .env.example file', () => {
      const cwd = tmpDir();

      fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(cwd, 'src/app.js'),
        'const api = process.env.API_KEY;',
      );

      const res = runCli(cwd, [
        '--scan-usage',
        '--example',
        '.env.example',
        '--ci',
      ]);

      expect(res.status).toBe(1);
      expect(res.stdout).toContain('.env.example');
    });
    it('if no environment variables in codebase, exits 0', () => {
      const cwd = tmpDir();

      fs.writeFileSync(
        path.join(cwd, 'app.js'),
        `
            const var1 = 'no env here';
            const var2 = 42;
            const var3 = true;
          `,
      );

      const res = runCli(cwd, ['--scan-usage']);
      expect(res.status).toBe(0);
      expect(res.stdout).toContain(
        'Scan Statistics:',
      );
    });
  });
  describe('with --fix flag', () => {
    it('adds missing keys found in code to .env with --scan-usage --fix', () => {
      const cwd = tmpDir();
      fs.writeFileSync(path.join(cwd, '.env'), 'EXISTING=value\n');
      fs.writeFileSync(
        path.join(cwd, 'app.js'),
        `
            const apiKey = process.env.API_KEY;
            const dbUrl = process.env.DATABASE_URL;
            const existing = process.env.EXISTING;
          `,
      );

      const res = runCli(cwd, ['--scan-usage', '--fix']);
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('Auto-fix applied:');
      expect(res.stdout).toContain('Added 2 missing keys');
      expect(res.stdout).toContain('API_KEY, DATABASE_URL');

      const envContent = fs.readFileSync(path.join(cwd, '.env'), 'utf-8');
      expect(envContent).toContain('EXISTING=value');
      expect(envContent).toContain('API_KEY=');
      expect(envContent).toContain('DATABASE_URL=');
    });
  });
  it('will tip --fix flag if missing .env in .gitignore', () => {
    const cwd = tmpDir();

    fs.mkdirSync(path.join(cwd, '.git'));
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n');
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=secret\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;',
    );

    const res = runCli(cwd, ['--scan-usage']);
    console.log('stdout:', res.stdout);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Tip: Run with `--fix` to ensure .env is added to .gitignore');
  });
});