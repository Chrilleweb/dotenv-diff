import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { makeTmpDir, touch, rmrf } from '../utils/fs-helpers.js';
import { parseEnvFile } from '../../src/core/parseEnv.js';
import { diffEnv } from '../../src/core/diffEnv.js';

const tmpDirs: string[] = [];

afterEach(() => {
  while (tmpDirs.length) {
    rmrf(tmpDirs.pop()!);
  }
});

describe('compare flow', () => {
  it('parses files and reports differences', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env'), 'A=1\nB=2\n');
    touch(path.join(cwd, '.env.example'), 'A=1\nB=\nC=3\n');

    const current = parseEnvFile(path.join(cwd, '.env'));
    const example = parseEnvFile(path.join(cwd, '.env.example'));
    const res = diffEnv(current, example, true);

    expect(res.missing).toEqual(['C']);
    expect(res.extra).toEqual([]);
    expect(res.valueMismatches).toEqual([]);
  });
});
