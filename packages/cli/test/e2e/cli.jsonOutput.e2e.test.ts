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

describe('--json output in scan mode', () => {
  it('Loaded config will not appear in JSON output', () => {
    const cwd = tmpDir();
    fs.writeFileSync(
      path.join(cwd, 'dotenv-diff.config.json'),
      JSON.stringify({
        scanUsage: true,
      }),
    );
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src/index.ts'), `console.log('Hello');`);

    const res = runCli(cwd, ['--json']);

    expect(res.status).toBe(0);

    const output = JSON.parse(res.stdout);
    expect(output.loadedConfig).toBeUndefined();
  });
});
