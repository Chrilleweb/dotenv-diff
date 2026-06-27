import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'path';
import { runMatrix } from '../../../src/commands/matrix.js';
import { makeTmpDir, touch, rmrf } from '../../utils/fs-helpers.js';
import type { MatrixRunOptions } from '../../../src/config/types.js';

const tmpDirs: string[] = [];

function baseOptions(overrides: Partial<MatrixRunOptions>): MatrixRunOptions {
  return {
    cwd: '',
    files: [],
    ignore: [],
    ignoreRegex: [],
    checkValues: false,
    json: false,
    showStats: true,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tmpDirs.length) {
    rmrf(tmpDirs.pop()!);
  }
});

describe('runMatrix', () => {
  it('auto-discovers all .env* files and exits with error when they differ', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env.production'), 'DATABASE_URL=prod\nAPI_KEY=k\n');
    touch(path.join(cwd, '.env.staging'), 'DATABASE_URL=stage\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(baseOptions({ cwd }));

    expect(result.exitWithError).toBe(true);
  });

  it('exits cleanly when every file has the same keys', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env.production'), 'DATABASE_URL=prod\n');
    touch(path.join(cwd, '.env.staging'), 'DATABASE_URL=stage\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(baseOptions({ cwd }));

    expect(result.exitWithError).toBe(false);
  });

  it('uses explicit files instead of auto-discovering when given', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env.production'), 'A=1\n');
    touch(path.join(cwd, '.env.staging'), 'A=1\n');
    touch(path.join(cwd, '.env.example'), 'A=\nB=\n');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(
      baseOptions({ cwd, files: ['.env.production', '.env.staging'] }),
    );

    expect(result.exitWithError).toBe(false);
    const printed = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(printed).not.toContain('.env.example');
  });

  it('reports an error and exits when an explicit file is missing', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env.production'), 'A=1\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(
      baseOptions({ cwd, files: ['.env.production', '.env.missing'] }),
    );

    expect(result.exitWithError).toBe(true);
  });

  it('errors out when fewer than 2 files are found', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env'), 'A=1\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(baseOptions({ cwd }));

    expect(result.exitWithError).toBe(true);
  });

  it('flags value mismatches as errors when checkValues is enabled', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env.production'), 'A=1\n');
    touch(path.join(cwd, '.env.staging'), 'A=2\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(baseOptions({ cwd, checkValues: true }));

    expect(result.exitWithError).toBe(true);
  });

  it('ignores keys matching --ignore', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env.production'), 'A=1\nSECRET=x\n');
    touch(path.join(cwd, '.env.staging'), 'A=1\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(baseOptions({ cwd, ignore: ['SECRET'] }));

    expect(result.exitWithError).toBe(false);
  });

  it('outputs JSON for missing explicit files instead of printing the table', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env.production'), 'A=1\n');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(
      baseOptions({
        cwd,
        files: ['.env.production', '.env.missing'],
        json: true,
      }),
    );

    expect(result.exitWithError).toBe(true);
    expect(logSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(parsed).toEqual({
      error: 'files-not-found',
      missing: ['.env.missing'],
    });
  });

  it('outputs JSON when fewer than 2 files are found', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env'), 'A=1\n');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(baseOptions({ cwd, json: true }));

    expect(result.exitWithError).toBe(true);
    expect(logSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(parsed).toEqual({ error: 'insufficient-files', found: 1 });
  });

  it('outputs valid JSON and suppresses table output when json is true', async () => {
    const cwd = makeTmpDir();
    tmpDirs.push(cwd);
    touch(path.join(cwd, '.env.production'), 'A=1\n');
    touch(path.join(cwd, '.env.staging'), 'A=1\n');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runMatrix(baseOptions({ cwd, json: true }));

    expect(result.exitWithError).toBe(false);
    expect(logSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(parsed.allMatch).toBe(true);
  });
});
