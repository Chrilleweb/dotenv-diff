import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import { makeTmpDir, rmrf } from '../utils/fs-helpers.js';
import { buildOnce, runCli, cleanupBuild } from '../utils/cli-helpers.js';

const pkg = JSON.parse(
  fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

let cwd: string;

beforeAll(() => {
  buildOnce();
  cwd = makeTmpDir();
});

afterAll(() => {
  rmrf(cwd);
  cleanupBuild();
});

describe('--version', () => {
  it.each(['--version', '-v'])(
    '%s prints the package version and exits 0',
    (flag) => {
      const res = runCli(cwd, [flag]);
      expect(res.status).toBe(0);
      expect(res.stdout.trim()).toBe(pkg.version);
    },
  );

  it('--help lists the version flag and describes the scan', () => {
    const res = runCli(cwd, ['--help']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('-v, --version');
    expect(res.stdout).toContain('Scan your codebase');
  });
});
