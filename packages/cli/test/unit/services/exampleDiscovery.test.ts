import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { makeTmpDir, touch, rmrf } from '../../utils/fs-helpers.js';
import { discoverExampleScopes } from '../../../src/services/exampleDiscovery.js';

const tmpDirs: string[] = [];

afterEach(() => {
  while (tmpDirs.length) rmrf(tmpDirs.pop()!);
});

function tmp(): string {
  const dir = makeTmpDir();
  tmpDirs.push(dir);
  return dir;
}

describe('discoverExampleScopes', () => {
  it('returns an empty list when there are no nested example files', () => {
    const cwd = tmp();
    touch(path.join(cwd, '.env.example'), 'ROOT_KEY=\n');
    touch(path.join(cwd, 'src', 'app.ts'), 'const a = 1;');

    // The root example file is skipped (handled by the primary comparison file).
    expect(discoverExampleScopes(cwd)).toEqual([]);
  });

  it('discovers a nested .env.example and scopes its keys to that directory', () => {
    const cwd = tmp();
    touch(
      path.join(cwd, 'upgrade-impact', '.env.example'),
      'OPENAI_API_KEY=\n',
    );

    const scopes = discoverExampleScopes(cwd);

    expect(scopes).toHaveLength(1);
    expect(scopes[0]?.dir).toBe('upgrade-impact');
    expect([...scopes[0]!.keys]).toEqual(['OPENAI_API_KEY']);
  });

  it('matches non-standard example filenames (.env-example, .env.sample, .env.template)', () => {
    const cwd = tmp();
    touch(path.join(cwd, 'docker-swarm', '.env-example'), 'SWARM=\n');
    touch(path.join(cwd, 'svc', '.env.sample'), 'SAMPLE=\n');
    touch(path.join(cwd, 'tpl', '.env.template'), 'TPL=\n');
    // A plain .env is not an example file and must be ignored.
    touch(path.join(cwd, 'other', '.env'), 'REAL=\n');

    const dirs = discoverExampleScopes(cwd)
      .map((s) => s.dir)
      .sort();

    expect(dirs).toEqual(['docker-swarm', 'svc', 'tpl']);
  });

  it('skips excluded directories such as node_modules', () => {
    const cwd = tmp();
    touch(
      path.join(cwd, 'node_modules', 'pkg', '.env.example'),
      'SHOULD_NOT_APPEAR=\n',
    );
    touch(path.join(cwd, 'app', '.env.example'), 'APP_KEY=\n');

    const dirs = discoverExampleScopes(cwd).map((s) => s.dir);

    expect(dirs).toEqual(['app']);
  });

  it('honors custom exclude patterns', () => {
    const cwd = tmp();
    touch(path.join(cwd, 'generated', '.env.example'), 'GEN=\n');
    touch(path.join(cwd, 'app', '.env.example'), 'APP_KEY=\n');

    const dirs = discoverExampleScopes(cwd, { exclude: ['generated'] }).map(
      (s) => s.dir,
    );

    expect(dirs).toEqual(['app']);
  });

  it('filters ignored keys out of a scope', () => {
    const cwd = tmp();
    touch(
      path.join(cwd, 'api', '.env.example'),
      'KEEP_ME=\nIGNORED_KEY=\nDROP_PREFIX_X=\n',
    );

    const scopes = discoverExampleScopes(cwd, {
      ignore: ['IGNORED_KEY'],
      ignoreRegex: [/^DROP_PREFIX_/],
    });

    expect([...scopes[0]!.keys]).toEqual(['KEEP_ME']);
  });

  it('sorts deepest scopes first', () => {
    const cwd = tmp();
    touch(path.join(cwd, 'a', '.env.example'), 'A=\n');
    touch(path.join(cwd, 'a', 'b', 'c', '.env.example'), 'C=\n');

    const dirs = discoverExampleScopes(cwd).map((s) => s.dir);

    expect(dirs).toEqual(['a/b/c', 'a']);
  });

  it('returns an empty list when the directory cannot be read', () => {
    const missing = path.join(tmp(), 'does-not-exist');

    expect(discoverExampleScopes(missing)).toEqual([]);
  });
});
