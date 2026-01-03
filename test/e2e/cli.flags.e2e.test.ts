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

describe('non-interactive flags', () => {
  it('CI: .env missing, .env.example exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--compare', '--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('.env file not found.');
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
  });

  it('YES: .env missing, .env.example exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--compare', '--yes']);
    expect(res.status).toBe(0);
    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe('A=1\n');
    expect(res.stdout).toContain(
      '.env file created successfully from .env.example',
    );
  });

  it('CI: .env.example missing, .env exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
    const res = runCli(cwd, ['--compare', '--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('.env.example file not found.');
    expect(fs.existsSync(path.join(cwd, '.env.example'))).toBe(false);
  });

  it('YES: .env.example missing, .env exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\nB=2\n');
    const res = runCli(cwd, ['--compare', '--yes']);
    expect(res.status).toBe(0);
    const exampleContent = fs.readFileSync(
      path.join(cwd, '.env.example'),
      'utf8',
    );
    expect(exampleContent).toBe('A=\nB=\n');
    expect(res.stdout).toContain(
      '.env.example file created successfully from .env',
    );
  });

  it('Both flags: --ci --yes', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--compare', '--ci', '--yes']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Both --ci and --yes provided');
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(true);
  });

  it('Case 1: no env files', () => {
    const cwd = tmpDir();
    const res = runCli(cwd, ['--compare', '--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'No .env* or .env.example file found. Skipping comparison.',
    );
  });
});

describe('--example should not compare file with itself', () => {
  it('Only --example - should skip comparing example with itself', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env'), 'B=2\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'B=2\n');

    const res = runCli(cwd, ['--compare', '--example', '.env.example']);
    expect(res.stdout).toContain('Comparing .env ↔ .env.example');
    expect(res.stdout).not.toContain('Comparing .env.example ↔ .env.example');
  });

  it('Only --example - no self-comparison, but still compares other env files', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.production'), 'B=2\n');
    fs.writeFileSync(path.join(cwd, '.env.example.production'), 'B=3\n');

    const res = runCli(cwd, ['--compare', '--example', '.env.example.staging']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain(
      'Comparing .env.production ↔ .env.example.staging',
    );
    expect(res.stdout).not.toContain(
      'Comparing .env.example.staging ↔ .env.example.staging',
    );
    expect(res.stdout).toContain('Missing keys');
  });
});

describe('--env and --example flags', () => {
  it('Both flags - success', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'SHOULD=IGNORE\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'SHOULD=DIFF\n');
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    const res = runCli(cwd, [
      '--compare',
      '--env',
      '.env.staging',
      '--example',
      '.env.example.staging',
    ]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Comparing .env.staging ↔ .env.example.staging',
    );
    expect(res.stdout).not.toContain('SHOULD=DIFF');
  });

  it('Both flags - env missing, should be created with --yes flag', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    const res = runCli(cwd, [
      '--compare',
      '--env',
      '.env.staging',
      '--example',
      '.env.example.staging',
      '--yes',
    ]);
    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(cwd, '.env.staging'))).toBe(true);
    expect(res.stdout).toContain('.env.staging file created successfully');
  });

  it('Both flags - example missing, should be created with --yes flag', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    const res = runCli(cwd, [
      '--compare',
      '--env',
      '.env.staging',
      '--example',
      '.env.example.staging',
      '--yes',
    ]);
    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(cwd, '.env.example.staging'))).toBe(true);
    expect(res.stdout).toContain(
      '.env.example.staging file created successfully',
    );
  });

  it('Only --env - matching example exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    const res = runCli(cwd, ['--compare', '--env', '.env.staging']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Comparing .env.staging ↔ .env.example.staging',
    );
  });

  it('Only --env - fallback example', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--compare', '--env', '.env.staging']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Comparing .env.staging ↔ .env.example');
  });

  it('Only --env - example missing entirely', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\nB=2\n');
    const res = runCli(cwd, ['--compare', '--env', '.env.staging', '--yes']);
    expect(res.status).toBe(0);
    const exampleContent = fs.readFileSync(
      path.join(cwd, '.env.example'),
      'utf8',
    );
    expect(exampleContent).toBe('A=\nB=\n');
    expect(res.stdout).toContain('.env.example file created successfully');
  });

  it('Only --example - matching env exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    const res = runCli(cwd, ['--compare', '--example', '.env.example.staging']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Comparing .env.staging ↔ .env.example.staging',
    );
  });
});

describe('duplicate detection', () => {
  it('warns on duplicates in env file', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=1\nFOO=2\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=\n');
    const res = runCli(cwd, ['--compare']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Duplicate keys in .env (last occurrence wins):',
    );
    expect(res.stdout).toContain('- FOO (2 occurrences)');
  });

  it('warns on duplicates in example file', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=\nFOO=\n');
    const res = runCli(cwd, ['--compare']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Duplicate keys in .env.example (last occurrence wins):',
    );
    expect(res.stdout).toContain('- FOO (2 occurrences)');
  });

  it('suppresses warnings with flag', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=1\nFOO=2\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=\n');
    const res = runCli(cwd, ['--compare', '--allow-duplicates']);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Duplicate keys in .env');
  });
  describe('--json output', () => {
    it('prints a JSON array with ok=true when files match', () => {
      const cwd = tmpDir();
      fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
      fs.writeFileSync(path.join(cwd, '.env.example'), 'A=\n');

      const res = runCli(cwd, ['--compare', '--json']);

      expect(res.status).toBe(0);
      expect(() => JSON.parse(res.stdout)).not.toThrow();

      const arr = JSON.parse(res.stdout);
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBeGreaterThan(0);
      expect(arr[0].env).toBe('.env');
      expect(arr[0].example).toBe('.env.example');
      expect(arr[0].ok).toBe(true);

      expect(res.stdout).not.toContain('Comparing');
      expect(res.stdout).not.toContain('Missing keys');
    });

    it('prints JSON and exits 1 when there are missing keys', () => {
      const cwd = tmpDir();
      fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
      fs.writeFileSync(path.join(cwd, '.env.example'), 'A=\nB=\n');

      const res = runCli(cwd, ['--compare', '--json']);

      expect(res.status).toBe(1);
      const arr = JSON.parse(res.stdout);
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBeGreaterThan(0);
      expect(arr[0].env).toBe('.env');
      expect(arr[0].example).toBe('.env.example');
      expect(arr[0].missing).toContain('B');

      expect(res.stdout).not.toContain('Comparing');
      expect(res.stdout).not.toContain('Missing keys');
    });
  });

  describe('--only flag', () => {
    it('fails on flag only missing', () => {
      const cwd = tmpDir();
      fs.writeFileSync(path.join(cwd, '.env'), 'A=1\nC=2\n');
      fs.writeFileSync(path.join(cwd, '.env.example'), 'A=\nB=\nC=\n');

      const res = runCli(cwd, ['--compare', '--only', 'missing']);

      expect(res.status).toBe(1);
      expect(res.stdout).toContain('Comparing .env ↔ .env.example');
      expect(res.stdout).toContain('❌ Missing keys:');
      expect(res.stdout).not.toContain('Extra keys');
    });
    it('warns on flag only extra', () => {
      const cwd = tmpDir();
      fs.writeFileSync(path.join(cwd, '.env'), 'A=1\nC=2\nD=3\n');
      fs.writeFileSync(path.join(cwd, '.env.example'), 'A=\nB=\nC=\n');

      const res = runCli(cwd, ['--compare', '--only', 'extra']);

      expect(res.status).toBe(0);
      expect(res.stdout).toContain('Comparing .env ↔ .env.example');
      expect(res.stdout).not.toContain('❌ Missing keys:');
      expect(res.stdout).toContain('⚠️  Extra keys (not in example):');
    });
  });
  describe('--fix flag', () => {
    it('returns correct JSON format when fixing in scan mode', () => {
      const cwd = tmpDir();
      fs.writeFileSync(path.join(cwd, '.env'), 'EXISTING=value\n');
      fs.writeFileSync(
        path.join(cwd, 'app.js'),
        `
          const newVar = process.env.NEW_VAR;
        `,
      );

      const res = runCli(cwd, ['--scan-usage', '--fix', '--json']);
      expect(res.status).toBe(0);

      const output = JSON.parse(res.stdout);
      expect(output.missing).toBeUndefined();
      expect(output.stats).toBeDefined();
    });
  });
  it('does not duplicate keys in .env.example when they already exist', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'EXISTING=value\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'EXISTING=\nNEW_KEY=\n');
    fs.writeFileSync(
      path.join(cwd, 'app.js'),
      `
            const newKey = process.env.NEW_KEY;
          `,
    );

    const res = runCli(cwd, ['--scan-usage', '--fix']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Auto-fix applied');
    expect(res.stdout).toContain('Added 1 missing keys to .env');
    expect(res.stdout).not.toContain('Synced'); // Should not sync since key already exists

    const exampleContent = fs.readFileSync(
      path.join(cwd, '.env.example'),
      'utf-8',
    );
    const newKeyLines = exampleContent
      .split('\n')
      .filter((line) => line.includes('NEW_KEY'));
    expect(newKeyLines).toHaveLength(1); // Should not be duplicated
  });

  it('shows no changes needed when all used variables are already defined', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=value\n');
    fs.writeFileSync(
      path.join(cwd, 'app.js'),
      `
            const apiKey = process.env.API_KEY;
          `,
    );

    const res = runCli(cwd, ['--scan-usage', '--fix']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Auto-fix applied: no changes needed');
  });

  it('works with custom env file path in scan mode', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.local'), 'EXISTING=value\n');
    fs.writeFileSync(
      path.join(cwd, 'app.js'),
      `
            const newVar = process.env.NEW_VAR;
          `,
    );

    const res = runCli(cwd, ['--scan-usage', '--fix', '--env', '.env.local']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Auto-fix applied');
    expect(res.stdout).toContain('Added 1 missing keys to .env.local');

    const envContent = fs.readFileSync(path.join(cwd, '.env.local'), 'utf-8');
    expect(envContent).toContain('NEW_VAR=');
  });

  it('respects --ignore flag in scan mode', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'EXISTING=value\n');
    fs.writeFileSync(
      path.join(cwd, 'app.js'),
      `
            const ignored = process.env.IGNORED_VAR;
            const included = process.env.INCLUDED_VAR;
          `,
    );

    const res = runCli(cwd, [
      '--scan-usage',
      '--fix',
      '--ignore',
      'IGNORED_VAR',
    ]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Auto-fix applied');
    expect(res.stdout).toContain('INCLUDED_VAR');
    expect(res.stdout).not.toContain('IGNORED_VAR');

    const envContent = fs.readFileSync(path.join(cwd, '.env'), 'utf-8');
    expect(envContent).toContain('INCLUDED_VAR=');
    expect(envContent).not.toContain('IGNORED_VAR');
  });

  it('should exclude file when using --exclude-files', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'EXISTING=value\n');
    fs.writeFileSync(
      path.join(cwd, 'index.ts'),
      `
      const newVar = process.env.NEW_VAR;
    `,
    );

    // Exclude .ts files → NEW_VAR should not be detected
    const res = runCli(cwd, ['--scan-usage', '--exclude-files', '*.ts']);
    expect(res.status).toBe(0); // exit clean
    expect(res.stdout).not.toContain('NEW_VAR');
  });

  it('should only scan files provided with --files', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'EXISTING=value\n');

    fs.writeFileSync(
      path.join(cwd, 'component.js'),
      `
      console.log(process.env.NOT_DETECTED_VAR);
    `,
    );
    fs.writeFileSync(
      path.join(cwd, 'index.js'),
      `
      console.log(process.env.NEW_JS_VAR);
    `,
    );

    const res = runCli(cwd, ['--scan-usage', '--files', 'index.js']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('NEW_JS_VAR');
    expect(res.stdout).not.toContain('NOT_DETECTED_VAR');
  });
});
