import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync, execSync } from 'child_process';

let distDir: string;
let cliPath: string;
const tmpDirs: string[] = [];

beforeAll(() => {
  distDir = fs.mkdtempSync(path.join(process.cwd(), 'dist-test-'));
  const tscBin = path.join(process.cwd(), 'node_modules', '.bin', 'tsc');
  execSync(`${tscBin} --outDir ${distDir}`, { stdio: 'inherit' });
  cliPath = path.join(distDir, 'bin', 'dotenv-diff.js');
});

afterAll(() => {
  fs.rmSync(distDir, { recursive: true, force: true });
});

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-test-'));
  tmpDirs.push(dir);
  return dir;
}

function runCli(cwd: string, args: string[]) {
  return spawnSync('node', [cliPath, ...args], { cwd, encoding: 'utf8' });
}

describe('non-interactive flags', () => {
  it('CI: .env missing, .env.example exists', () => {
    const cwd = makeTmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('.env file not found.');
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
  });

  it('YES: .env missing, .env.example exists', () => {
    const cwd = makeTmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--yes']);
    expect(res.status).toBe(0);
    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe('A=1\n');
    expect(res.stdout).toContain('.env file created successfully from .env.example');
  });

  it('CI: .env.example missing, .env exists', () => {
    const cwd = makeTmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
    const res = runCli(cwd, ['--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('.env.example file not found.');
    expect(fs.existsSync(path.join(cwd, '.env.example'))).toBe(false);
  });

  it('YES: .env.example missing, .env exists', () => {
    const cwd = makeTmpDir();
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
    const cwd = makeTmpDir();
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--ci', '--yes']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Both --ci and --yes provided');
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(true);
  });

  it('Case 1: no env files', () => {
    const cwd = makeTmpDir();
    const res = runCli(cwd, ['--ci']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('No .env* or .env.example file found. Skipping comparison.');
  });
});

describe('--example should not compare file with itself', () => {
  it('Only --example - should skip comparing example with itself', () => {
  const cwd = makeTmpDir();
  fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
  fs.writeFileSync(path.join(cwd, '.env'), 'B=2\n');
  fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'B=2\n');
  

  const res = runCli(cwd, ['--example', '.env.example']);
  expect(res.stdout).toContain('Comparing .env ↔ .env.example');
  expect(res.stdout).not.toContain('Comparing .env.example ↔ .env.example');
});

it('Only --example - no self-comparison, but still compares other env files', () => {
  const cwd = makeTmpDir();
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
    const cwd = makeTmpDir();
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
    const cwd = makeTmpDir();
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
    const cwd = makeTmpDir();
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
    const cwd = makeTmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    const res = runCli(cwd, ['--env', '.env.staging']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Comparing .env.staging ↔ .env.example.staging',
    );
  });

  it('Only --env - fallback example', () => {
    const cwd = makeTmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    const res = runCli(cwd, ['--env', '.env.staging']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Comparing .env.staging ↔ .env.example');
  });

  it('Only --env - example missing entirely', () => {
    const cwd = makeTmpDir();
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
    const cwd = makeTmpDir();
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\n');
    const res = runCli(cwd, ['--example', '.env.example.staging']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Comparing .env.staging ↔ .env.example.staging',
    );
  });

  it('No flags - autoscan regression', () => {
    const cwd = makeTmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.staging'), 'A=1\n');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), 'A=1\nB=1\n');
    const res = runCli(cwd, []);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Comparing .env ↔ .env.example');
    expect(res.stdout).toContain(
      'Comparing .env.staging ↔ .env.example.staging',
    );
    expect(res.stdout).toContain('Missing keys');
  });
});
