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

/**
 * Sets up a clean project where .env and .env.example share the same keys
 * (so there are no missing/unused issues), the code uses them all, and .env is
 * gitignored — leaving comment warnings as the only variable under test.
 */
function setup(exampleBody: string) {
  const cwd = makeTmpDir();
  tmpDirs.push(cwd);
  fs.writeFileSync(path.join(cwd, '.gitignore'), '.env\n');
  fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=x\nDB_HOST=y\nPORT=1\n');
  fs.writeFileSync(path.join(cwd, '.env.example'), exampleBody);
  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, 'src', 'index.js'),
    'console.log(process.env.API_KEY, process.env.DB_HOST, process.env.PORT);',
  );
  return cwd;
}

// API_KEY documented via comment above; PORT via inline; DB_HOST undocumented.
const MIXED_EXAMPLE =
  '# API key for the service\nAPI_KEY=\nDB_HOST=\nPORT=3000 # server port\n';

describe('Comment Warnings (--comment-warnings)', () => {
  it('does not check comments by default (opt-in)', () => {
    const cwd = setup(MIXED_EXAMPLE);
    const res = runCli(cwd, []);
    expect(res.stdout).not.toContain('Undocumented keys');
  });

  it('warns about an undocumented example key when --comment-warnings is set', () => {
    const cwd = setup(MIXED_EXAMPLE);
    const res = runCli(cwd, ['--comment-warnings']);
    expect(res.stdout).toContain('Undocumented keys');
    expect(res.stdout).toContain('DB_HOST');
  });

  it('does not warn about keys documented above or inline', () => {
    const cwd = setup('# db host\nDB_HOST=\nAPI_KEY=key123 # the key\n');
    const res = runCli(cwd, ['--comment-warnings']);
    expect(res.stdout).not.toContain('Undocumented keys');
  });

  it('lists undocumented keys under commentWarnings in JSON mode', () => {
    const cwd = setup(MIXED_EXAMPLE);
    const res = runCli(cwd, ['--comment-warnings', '--json']);
    expect(res.stdout).toContain('"commentWarnings"');
    expect(res.stdout).toContain('"DB_HOST"');
    expect(res.stdout).not.toContain('Undocumented keys'); // no UI in json mode
  });

  it('exits with error under --strict when an undocumented key exists', () => {
    const cwd = setup(MIXED_EXAMPLE);
    const res = runCli(cwd, ['--comment-warnings', '--strict']);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Undocumented keys');
  });
});
