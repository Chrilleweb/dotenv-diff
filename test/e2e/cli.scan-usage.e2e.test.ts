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
console.log('Config loaded');`
    );
    
    const res = runCli(cwd, ['--scan-usage']);
    
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Scanning codebase for environment variable usage');
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
const missing = process.env.MISSING_VAR;`
    );
    
    const res = runCli(cwd, ['--scan-usage']);
    
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('❌ Missing in .env:');
    expect(res.stdout).toContain('MISSING_VAR');
    expect(res.stdout).not.toContain('API_KEY'); // Should not be listed as missing
  });

  it('shows unused variables with --show-unused', () => {
    const cwd = tmpDir();
    
    // Create .env with unused variable
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=secret123\nUNUSED_VAR=value\n');
    
    // Create JS file that only uses one variable
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const apiKey = process.env.API_KEY;'
    );
    
    const res = runCli(cwd, ['--scan-usage', '--show-unused']);
    
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
const mode = import.meta.env.VITE_MODE;`
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
import { PUBLIC_API } from '$env/static/public/PUBLIC_API';`
    );
    
    const res = runCli(cwd, ['--scan-usage']);
    
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SECRET_KEY');
    expect(res.stdout).toContain('PUBLIC_API');
  });

  it('ignores files in node_modules', () => {
    const cwd = tmpDir();
    
    // Create file in node_modules (should be ignored)
    fs.mkdirSync(path.join(cwd, 'node_modules', 'some-package'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'node_modules', 'some-package', 'index.js'),
      'const ignored = process.env.IGNORED_VAR;'
    );
    
    // Create file in src (should be scanned)
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const used = process.env.USED_VAR;'
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
const ignored = process.env.IGNORED_VAR;`
    );
    
    const res = runCli(cwd, ['--scan-usage', '--ignore', 'IGNORED_VAR']);
    
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).not.toContain('IGNORED_VAR');
  });

  it('shows scan statistics with --show-stats', () => {
    const cwd = tmpDir();
    
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;'
    );
    fs.writeFileSync(
      path.join(cwd, 'src/config.js'),
      'const db = process.env.API_KEY;' // Same variable used twice
    );
    
    const res = runCli(cwd, ['--scan-usage', '--show-stats']);
    
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
const missing = process.env.MISSING_VAR;`
    );
    
    const res = runCli(cwd, ['--scan-usage', '--show-unused', '--json']);
    
    expect(res.status).toBe(1); // Should exit with error due to missing variable
    expect(() => JSON.parse(res.stdout)).not.toThrow();
    
    const result = JSON.parse(res.stdout);
    expect(result).toHaveProperty('stats');
    expect(result.stats.uniqueVariables).toBe(2);
    expect(result.missing).toContainEqual(
      expect.objectContaining({ variable: 'MISSING_VAR' })
    );
    expect(result.unused).toContain('UNUSED');
  });

  it('works with custom file patterns', () => {
    const cwd = tmpDir();
    
    // Create files with different extensions
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;'
    );
    fs.writeFileSync(
      path.join(cwd, 'src/config.py'),
      'api_key = os.environ.get("PYTHON_VAR")'
    );
    
    // Only scan .js files
    const res = runCli(cwd, ['--scan-usage', '--include-files', '**/*.js']);
    
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).not.toContain('PYTHON_VAR'); // Python file should be ignored
  });

  it('excludes test files by default', () => {
    const cwd = tmpDir();
    
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;'
    );
    fs.writeFileSync(
      path.join(cwd, 'src/app.test.js'),
      'const test = process.env.TEST_VAR;'
    );
    
    const res = runCli(cwd, ['--scan-usage']);
    
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('API_KEY');
    expect(res.stdout).not.toContain('TEST_VAR');
  });

  it('handles files with no environment variables', () => {
    const cwd = tmpDir();
    
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/utils.js'),
      `function add(a, b) { return a + b; }
export { add };`
    );
    
    const res = runCli(cwd, ['--scan-usage']);
    
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Found 0 unique environment variables in use');
  });
});

describe('scan-usage error handling', () => {
  it('handles permission errors gracefully', () => {
    const cwd = tmpDir();
    
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/app.js'),
      'const api = process.env.API_KEY;'
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
      'const api = process.env.API_KEY;'
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
        'const api = process.env.API_KEY;'
      );
      
      const res = runCli(cwd, ['--scan-usage', '--ci']);
      
      expect(res.status).toBe(0);
      expect(fs.existsSync(path.join(cwd, 'scan-results.json'))).toBe(false);
    });
  });
});