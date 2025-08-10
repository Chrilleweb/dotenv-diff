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
  cliPath = path.join(distDir, 'cli.js');
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
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('.env file not found.');
    expect(res.stdout).toContain('Skipping .env creation (CI mode).');
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
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('.env.example file not found.');
    expect(res.stdout).toContain('Skipping .env.example creation (CI mode).');
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
