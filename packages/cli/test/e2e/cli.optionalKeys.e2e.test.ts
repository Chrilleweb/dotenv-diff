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
 * Sets up a project where `.env.example` documents two keys and `.env` only
 * defines DATABASE_URL, so REDIS_URL is the key under test. Both are used in
 * code and `.env` is gitignored, leaving optionality as the only variable.
 *
 * The usages deliberately avoid `console.log`, which would print the key names
 * in an exposure warning and mask what the missing-key assertions are checking.
 * @param exampleBody Contents to write to `.env.example`.
 * @param envBody Contents to write to `.env`.
 * @returns The temporary project directory.
 */
function setup(exampleBody: string, envBody = 'DATABASE_URL=postgres://x\n') {
  const cwd = makeTmpDir();
  tmpDirs.push(cwd);
  fs.writeFileSync(path.join(cwd, '.gitignore'), '.env\n');
  fs.writeFileSync(path.join(cwd, '.env'), envBody);
  fs.writeFileSync(path.join(cwd, '.env.example'), exampleBody);
  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, 'src', 'index.js'),
    'const db = process.env.DATABASE_URL;\nconst redis = process.env.REDIS_URL;\n',
  );
  return cwd;
}

const WITHOUT_ANNOTATION = 'DATABASE_URL=\nREDIS_URL=\n';
const WITH_ANNOTATION = 'DATABASE_URL=\n\n# @optional\nREDIS_URL=\n';

describe('Optional keys (@optional)', () => {
  describe('scan mode', () => {
    it('reports a key absent from .env as missing without the annotation', () => {
      const cwd = setup(WITHOUT_ANNOTATION);
      const res = runCli(cwd, []);
      expect(res.stdout).toContain('REDIS_URL');
      expect(res.status).toBe(1);
    });

    it('does not report an @optional key as missing', () => {
      const cwd = setup(WITH_ANNOTATION);
      const res = runCli(cwd, []);
      expect(res.stdout).not.toContain('REDIS_URL');
      expect(res.status).toBe(0);
    });

    it('still reports other keys as missing', () => {
      const cwd = setup('# @optional\nREDIS_URL=\n\nDATABASE_URL=\n', '\n');
      const res = runCli(cwd, []);
      expect(res.stdout).toContain('DATABASE_URL');
      expect(res.stdout).not.toContain('REDIS_URL');
      expect(res.status).toBe(1);
    });
  });

  describe('compare mode', () => {
    it('reports a key missing from .env without the annotation', () => {
      const cwd = setup(WITHOUT_ANNOTATION);
      const res = runCli(cwd, ['--compare']);
      expect(res.stdout).toContain('Missing keys');
      expect(res.stdout).toContain('REDIS_URL');
    });

    it('does not report an @optional key as missing', () => {
      const cwd = setup(WITH_ANNOTATION);
      const res = runCli(cwd, ['--compare']);
      expect(res.stdout).not.toContain('REDIS_URL');
    });

    it('does not report an @optional key that is present but empty', () => {
      const cwd = setup(
        WITH_ANNOTATION,
        'DATABASE_URL=postgres://x\nREDIS_URL=\n',
      );
      const res = runCli(cwd, ['--compare']);
      expect(res.stdout).not.toContain('REDIS_URL');
    });

    it('still reports a required key that is present but empty', () => {
      const cwd = setup(WITH_ANNOTATION, 'DATABASE_URL=\nREDIS_URL=\n');
      const res = runCli(cwd, ['--compare']);
      expect(res.stdout).toContain('DATABASE_URL');
    });
  });
});
