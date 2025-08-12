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
    const res = runCli(cwd, ['--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('.env file not found.');
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
  });

  it('YES: .env missing, .env.example exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--yes']);
    expect(res.status).toBe(0);
    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe('A=1\n');
    expect(res.stdout).toContain('.env file created successfully from .env.example');
  });

  it('CI: .env.example missing, .env exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
    const res = runCli(cwd, ['--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('.env.example file not found.');
    expect(fs.existsSync(path.join(cwd, '.env.example'))).toBe(false);
  });

  it('YES: .env.example missing, .env exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\nB=2\n');
    const res = runCli(cwd, ['--yes']);
    expect(res.status).toBe(0);
    const exampleContent = fs.readFileSync(
      path.join(cwd, '.env.example'),
      'utf8',
    );
    expect(exampleContent).toBe('A=\nB=\n');
    expect(res.stdout).toContain('.env.example file created successfully from .env');
  });

  it('Both flags: --ci --yes', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--ci', '--yes']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Both --ci and --yes provided');
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(true);
  });

  it('Case 1: no env files', () => {
    const cwd = tmpDir();
    const res = runCli(cwd, ['--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('No .env* or .env.example file found. Skipping comparison.');
  });
});

describe('--example should not compare file with itself', () => {
  it('Only --example - should skip comparing example with itself', () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
  fs.writeFileSync(path.join(cwd, '.env'), 'B=2\n');
  fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'B=2\n');
  

  const res = runCli(cwd, ['--example', '.env.example']);
  expect(res.stdout).toContain('Comparing .env ↔ .env.example');
  expect(res.stdout).not.toContain('Comparing .env.example ↔ .env.example');
});

it('Only --example - no self-comparison, but still compares other env files', () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
  fs.writeFileSync(path.join(cwd, '.env.production'), 'B=2\n');
  fs.writeFileSync(path.join(cwd, '.env.example.production'), 'B=3\n');

  const res = runCli(cwd, ['--example', '.env.example.staging']);
  expect(res.status).toBe(1);
  expect(res.stdout).toContain('Comparing .env.production ↔ .env.example.staging');
  expect(res.stdout).not.toContain('Comparing .env.example.staging ↔ .env.example.staging');
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

  it('Both flags - env missing', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    const res = runCli(cwd, [
      '--env',
      '.env.staging',
      '--example',
      '.env.example.staging',
    ]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('--env file not found');
  });

  it('Both flags - example missing', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    const res = runCli(cwd, [
      '--env',
      '.env.staging',
      '--example',
      '.env.example.staging',
    ]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('--example file not found');
  });

  it('Only --env - matching example exists', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    const res = runCli(cwd, ['--env', '.env.staging']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Comparing .env.staging ↔ .env.example.staging',
    );
  });

  it('Only --env - fallback example', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--env', '.env.staging']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Comparing .env.staging ↔ .env.example');
  });

  it('Only --env - example missing entirely', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\nB=2\n');
    const res = runCli(cwd, ['--env', '.env.staging', '--yes']);
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
    const res = runCli(cwd, ['--example', '.env.example.staging']);
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
    const res = runCli(cwd, []);
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
    const res = runCli(cwd, []);
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
    const res = runCli(cwd, ['--allow-duplicates']);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Duplicate keys');
  });
  describe('--json output', () => {
  it('prints a JSON array with ok=true when files match', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=\n');

    const res = runCli(cwd, ['--json']);

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

    const res = runCli(cwd, ['--json']);

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
});
