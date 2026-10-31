import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
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
    fs.writeFileSync(path.join(cwd, 'src/index.ts'), 'console.log(\'Hello\');');

    const res = runCli(cwd, ['--json']);

    expect(res.status).toBe(0);

    const output = JSON.parse(res.stdout);
    expect(output.loadedConfig).toBeUndefined();
  });
});

describe('--json output through a slow pipe', () => {
  it('writes complete JSON when the reader is slower than the CLI', async () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=1\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    // Enough missing keys to produce JSON far larger than a 64 KB pipe buffer
    const source = Array.from(
      { length: 3000 },
      (_, i) => `const v${i} = process.env.SOME_LONG_VARIABLE_NAME_${i};`,
    ).join('\n');
    fs.writeFileSync(path.join(cwd, 'src/index.ts'), source);

    const { cliPath } = buildOnce();
    const child = spawn('node', [cliPath, '--ci', '--json'], { cwd });
    const closed = new Promise<number | null>((resolve) =>
      child.on('close', resolve),
    );

    // Don't read stdout until the pipe buffer has filled up, so the CLI has
    // pending writes when it finishes its work.
    child.stdout.pause();
    await new Promise((resolve) => setTimeout(resolve, 500));

    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stdout.resume();

    const status = await closed;

    expect(status).toBe(1);
    expect(stdout.length).toBeGreaterThan(65536);
    const output = JSON.parse(stdout);
    expect(output.missing).toHaveLength(3000);
  });
});
