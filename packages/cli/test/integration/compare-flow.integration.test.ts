import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { makeTmpDir, touch, rmrf } from '../utils/fs-helpers.js';
import { parseEnvFile } from '../../src/services/parseEnvFile.js';
import { diffEnv } from '../../src/core/diffEnv.js';
import { suggestTypos } from '../../src/core/suggestTypos.js';

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

  it('cross-references missing keys against extra keys to suggest typos', () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    // .env has a typo (DATABAS_URL) of the example key (DATABASE_URL)
    touch(path.join(cwd, '.env'), 'DATABAS_URL=postgres://x\nPORT=3000\n');
    touch(path.join(cwd, '.env.example'), 'DATABASE_URL=\nPORT=\n');

    const current = parseEnvFile(path.join(cwd, '.env'));
    const example = parseEnvFile(path.join(cwd, '.env.example'));
    const res = diffEnv(current, example);

    expect(res.missing).toEqual(['DATABASE_URL']);
    expect(res.extra).toEqual(['DATABAS_URL']);

    const suggestions = suggestTypos(res.missing, res.extra);
    expect(suggestions).toEqual([
      { key: 'DATABASE_URL', didYouMean: 'DATABAS_URL', distance: 1 },
    ]);
  });
});
