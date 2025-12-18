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

describe('cli warnings count', () => {
  it('should show correct warnings count in scan statistics', () => {
    const cwd = tmpDir();

    // Code using two env vars
    fs.writeFileSync(
      path.join(cwd, 'index.js'),
      `
const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;
`,
    );

    // .env.example contains:
    // - lowercase key (uppercase warning)
    // - unused key (unused warning)
    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      `
api_key=test
UNUSED_KEY=value
`,
    );

    const res = runCli(cwd, ['--scan-usage']);

    /**
     * Expected warnings:
     * - 2x missing (API_KEY, API_URL)
     * - 1x uppercase warning (api_key)
     * - 1x unused warning (UNUSED_KEY)
     *
     * Total: 4
     */
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('📊 Scan Statistics:');
    expect(res.stdout).toContain('Warnings: 5');
  });
});
