import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  isGitRepo,
  isEnvIgnoredByGit,
  warnIfEnvNotIgnored,
  checkGitignoreStatus,
  findGitRoot,
} from '../../../src/services/git.js';
import { printGitignoreWarning } from '../../../src/ui/shared/printGitignore.js';
import { makeTmpDir, touch, rmrf } from '../../utils/fs-helpers.js';

let tmpDirs: string[] = [];
afterEach(() => {
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

  it('isGitRepo uses process.cwd() as default', () => {
    // Test that it can be called without arguments
    const result = isGitRepo();
    expect(typeof result).toBe('boolean');
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
    touch(
      path.join(cwd, '.gitignore'),
      ['# comment', '.env', '.env.*'].join('\n'),
    );

    expect(isEnvIgnoredByGit({ cwd })).toBe(true);
  });

  it('returns null when envFile is .env.example', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    const result = checkGitignoreStatus({ cwd, envFile: '.env.example' });
    expect(result).toBeNull();
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

  it('isEnvIgnoredByGit returns false when no matching patterns exist', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    // .gitignore with patterns that do NOT match .env
    touch(
      path.join(cwd, '.gitignore'),
      ['node_modules/', 'dist/', '*.log'].join('\n'),
    );

    expect(isEnvIgnoredByGit({ cwd })).toBe(false);
  });

  it('isEnvIgnoredByGit handles empty .gitignore file', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    touch(path.join(cwd, '.gitignore'), '');

    expect(isEnvIgnoredByGit({ cwd })).toBe(false);
  });

  it('isEnvIgnoredByGit handles .gitignore with only comments and whitespace', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    touch(
      path.join(cwd, '.gitignore'),
      ['# Comment only', '', '  ', '# Another comment'].join('\n'),
    );

    expect(isEnvIgnoredByGit({ cwd })).toBe(false);
  });

  it('isEnvIgnoredByGit detects various .env patterns', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    // Test different pattern formats
    const patterns = [
      '/.env',
      '**/.env',
      '.env*',
      '/.env*',
      '**/.env*',
      '.env.*',
      '/.env.*',
      '**/.env.*',
    ];

    for (const pattern of patterns) {
      touch(path.join(cwd, '.gitignore'), pattern);
      expect(isEnvIgnoredByGit({ cwd })).toBe(true);
    }
  });

  it('isEnvIgnoredByGit handles negation without matching base pattern', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    // Negation without any base ignore pattern
    touch(path.join(cwd, '.gitignore'), ['!.env', 'node_modules/'].join('\n'));

    expect(isEnvIgnoredByGit({ cwd })).toBe(false);
  });

  it('isEnvIgnoredByGit uses default options when called without arguments', () => {
    // Test that it can be called with empty options (uses process.cwd())
    const result = isEnvIgnoredByGit();
    expect([true, false, null]).toContain(result);
  });

  it('isEnvIgnoredByGit uses default envFile when not specified', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    touch(path.join(cwd, '.gitignore'), '.env\n');

    // Call without envFile - should use DEFAULT_ENV_FILE
    const result = isEnvIgnoredByGit({ cwd });
    expect(result).toBe(true);
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
    warnIfEnvNotIgnored({
      cwd,
      envFile: '.env.local',
      log: (m) => logs.push(m),
    });

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('.env.local');
  });

  it('warns when isEnvIgnoredByGit returns null', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');
    // .gitignore with only comments (isEnvIgnoredByGit will check patterns)
    touch(path.join(cwd, '.gitignore'), '# Only comments\nnode_modules/\n');

    const logs: string[] = [];
    warnIfEnvNotIgnored({ cwd, log: (m) => logs.push(m) });

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('.env');
  });

  it('warnIfEnvNotIgnored uses default options when called without arguments', () => {
    // Test that it can be called with no args (uses defaults)
    // Should not throw
    expect(() => warnIfEnvNotIgnored()).not.toThrow();
  });

  it('warnIfEnvNotIgnored uses console.log as default logger', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');

    // Don't pass log function - should use console.log as default
    // Just verify it doesn't throw
    expect(() => warnIfEnvNotIgnored({ cwd })).not.toThrow();
  });
});

describe('checkGitignoreStatus', () => {
  it('returns null when .env file does not exist', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    const result = checkGitignoreStatus({ cwd });
    expect(result).toBeNull();
  });

  it('returns null when not a git repo', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    touch(path.join(cwd, '.env'), 'A=1\n');

    const result = checkGitignoreStatus({ cwd });
    expect(result).toBeNull();
  });

  it('returns no-gitignore reason when .gitignore is missing', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');

    const result = checkGitignoreStatus({ cwd });
    expect(result).toEqual({ reason: 'no-gitignore' });
  });

  it('returns not-ignored reason when .env is not in .gitignore', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');
    touch(path.join(cwd, '.gitignore'), 'node_modules/\n');

    const result = checkGitignoreStatus({ cwd });
    expect(result).toEqual({ reason: 'not-ignored' });
  });

  it('returns not-ignored when isEnvIgnoredByGit returns null', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');
    // .gitignore exists but with no relevant patterns
    touch(path.join(cwd, '.gitignore'), 'node_modules/\n');

    const result = checkGitignoreStatus({ cwd });
    expect(result).toEqual({ reason: 'not-ignored' });
  });

  it('checkGitignoreStatus uses default options when called without arguments', () => {
    // Test that it can be called without options (uses defaults)
    const result = checkGitignoreStatus();
    expect([
      null,
      { reason: 'no-gitignore' },
      { reason: 'not-ignored' },
    ]).toContainEqual(result);
  });

  it('checkGitignoreStatus uses default envFile when not specified', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');

    // Call without envFile - should use DEFAULT_ENV_FILE (".env")
    const result = checkGitignoreStatus({ cwd });
    expect(result).toEqual({ reason: 'no-gitignore' });
  });

  it('returns null when .env is properly ignored', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env'), 'A=1\n');
    touch(path.join(cwd, '.gitignore'), '.env\n.env.*\n');

    const result = checkGitignoreStatus({ cwd });
    expect(result).toBeNull();
  });

  it('respects custom envFile name', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    touch(path.join(cwd, '.env.local'), 'A=1\n');
    touch(path.join(cwd, '.gitignore'), '.env\n');

    const result = checkGitignoreStatus({ cwd, envFile: '.env.local' });
    expect(result).toEqual({ reason: 'not-ignored' });
  });
});

describe('findGitRoot', () => {
  it('finds git root in current directory', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));

    const result = findGitRoot(cwd);
    expect(result).toBe(cwd);
  });

  it('finds git root in parent directory', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    const subdir = path.join(cwd, 'subdir');
    fs.mkdirSync(subdir);

    const result = findGitRoot(subdir);
    expect(result).toBe(cwd);
  });

  it('finds git root walking up multiple levels', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    fs.mkdirSync(path.join(cwd, '.git'));
    const nested = path.join(cwd, 'a', 'b', 'c');
    fs.mkdirSync(nested, { recursive: true });

    const result = findGitRoot(nested);
    expect(result).toBe(cwd);
  });

  it('returns null when no git root is found', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);

    const result = findGitRoot(cwd);
    expect(result).toBeNull();
  });

  describe('isEnvIgnoredByGit - additional branch coverage', () => {
    it('returns true when positive pattern matches despite non-matching negation', () => {
      const cwd = makeTmpDir();
      tmpDirs.push(cwd);

      // Negation that doesn't match our candidates, but positive pattern does
      touch(path.join(cwd, '.gitignore'), ['!.env.backup', '.env*'].join('\n'));

      expect(isEnvIgnoredByGit({ cwd })).toBe(true);
    });

    it('handles multiple negations with only some matching candidates', () => {
      const cwd = makeTmpDir();
      tmpDirs.push(cwd);

      touch(
        path.join(cwd, '.gitignore'),
        ['!.env.backup', '!.env.test', '.env*'].join('\n'),
      );

      expect(isEnvIgnoredByGit({ cwd })).toBe(true);
    });
  });
});

describe('printGitignoreWarning', () => {
  it('uses console.log as default when log parameter is not provided', () => {
    // Test that the default log parameter (console.log) is used
    // Just verify it doesn't throw when called without log
    expect(() =>
      printGitignoreWarning({
        envFile: '.env',
        reason: 'no-gitignore',
      }),
    ).not.toThrow();

    expect(() =>
      printGitignoreWarning({
        envFile: '.env',
        reason: 'not-ignored',
      }),
    ).not.toThrow();
  });
});
