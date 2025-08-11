import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  isGitRepo,
  isEnvIgnoredByGit,
  warnIfEnvNotIgnored,
} from '../src/services/git.js';

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
  return dir;
}
function touch(filePath: string, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
function rmrf(p: string) {
  fs.rmSync(p, { recursive: true, force: true });
}

let tmpDirs: string[] = [];
afterEach(() => {
  // clean up temp dirs
  for (const dir of tmpDirs) rmrf(dir);
  tmpDirs = [];
});

describe('checkGitignore helpers', () => {
  it('isGitRepo returns true when .git directory exists', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    expect(isGitRepo(cwd)).toBe(true);
  });

  it('isGitRepo returns false when .git directory is missing', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    expect(isGitRepo(cwd)).toBe(false);
  });

  it('isEnvIgnoredByGit returns null when .gitignore does not exist', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    expect(isEnvIgnoredByGit({ cwd })).toBeNull();
  });

  it('isEnvIgnoredByGit detects .env ignore patterns', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    // Typical patterns that should be accepted by our candidate set
    touch(path.join(cwd, '.gitignore'), ['# comment', '.env', '.env.*'].join('\n'));

    expect(isEnvIgnoredByGit({ cwd })).toBe(true);
  });

  it('isEnvIgnoredByGit returns false if a negation for candidate exists', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    // Negation should flip to "not ignored"
    touch(path.join(cwd, '.gitignore'), ['!.env', '.env*'].join('\n'));

    expect(isEnvIgnoredByGit({ cwd })).toBe(false);
  });

  it('isEnvIgnoredByGit respects custom envFile name', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    // Custom file name
    touch(path.join(cwd, '.gitignore'), ['.env.local', '.env.*'].join('\n'));

    // For envFile=".env.local" it should be considered ignored
    expect(isEnvIgnoredByGit({ cwd, envFile: '.env.local' })).toBe(true);

    // For default ".env", not necessarily covered by only ".env.local"
    expect(isEnvIgnoredByGit({ cwd, envFile: '.env' })).toBe(true); // because `.env.*` matches
  });
});

describe('warnIfEnvNotIgnored', () => {
  it('does nothing when .env does not exist', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    const logs: string[] = [];
    warnIfEnvNotIgnored({ cwd, log: (m) => logs.push(m) });

    expect(logs.length).toBe(0);
  });

  it('does nothing when not a git repo', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    // Create .env but no .git folder
    touch(path.join(cwd, '.env'), 'A=1\n');

    const logs: string[] = [];
    warnIfEnvNotIgnored({ cwd, log: (m) => logs.push(m) });

    expect(logs.length).toBe(0);
  });

  it('warns when .gitignore is missing', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    // Make it a git repo and create .env
    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');

    const logs: string[] = [];
    warnIfEnvNotIgnored({ cwd, log: (m) => logs.push(m) });

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('No .gitignore found'); // substring survives chalk coloring
  });

  it('warns when .gitignore exists but does not ignore .env', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');
    // .gitignore without any .env patterns
    touch(path.join(cwd, '.gitignore'), 'node_modules/\ndist/\n');

    const logs: string[] = [];
    warnIfEnvNotIgnored({ cwd, log: (m) => logs.push(m) });

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('is not ignored by Git');
    expect(logs[0]).toContain('.env');
  });

  it('does not warn when .gitignore ignores .env', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');
    touch(path.join(cwd, '.gitignore'), '.env\n.env.*\n');

    const logs: string[] = [];
    warnIfEnvNotIgnored({ cwd, log: (m) => logs.push(m) });

    expect(logs.length).toBe(0);
  });

  it('respects custom envFile name when warning', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env.local'), 'A=1\n');
    // .gitignore ignores only default .env, not .env.local
    touch(path.join(cwd, '.gitignore'), '.env\n');

    const logs: string[] = [];
    warnIfEnvNotIgnored({ cwd, envFile: '.env.local', log: (m) => logs.push(m) });

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('.env.local');
  });
});
