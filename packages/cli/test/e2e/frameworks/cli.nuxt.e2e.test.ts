import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { makeTmpDir, rmrf } from '../../utils/fs-helpers.js';
import { buildOnce, runCli, cleanupBuild } from '../../utils/cli-helpers.js';

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

/**
 * Minimal Nuxt project so detectFramework() → "nuxt"
 */
function makeNuxtProject(cwd: string) {
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: {
        nuxt: '3.10.0',
      },
    }),
  );

  fs.mkdirSync(path.join(cwd, 'pages'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'server/api'), { recursive: true });
}

describe('Nuxt environment variable usage rules', () => {
  it('warns when process.env is used in client/universal code', () => {
    const cwd = tmpDir();
    makeNuxtProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'pages/index.vue'),
      `<script setup lang="ts">
const key = process.env.API_SECRET;
</script>`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'API_SECRET=ok');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain('useRuntimeConfig()');
    expect(res.stdout).toContain('API_SECRET');
  });

  it('does NOT warn when process.env is used in the server directory', () => {
    const cwd = tmpDir();
    makeNuxtProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'server/api/data.ts'),
      `export default defineEventHandler(() => {
        return process.env.API_SECRET;
      });`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'API_SECRET=ok');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).not.toContain('useRuntimeConfig()');
  });

  it('does NOT warn for process.env inside nuxt.config', () => {
    const cwd = tmpDir();
    makeNuxtProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'nuxt.config.ts'),
      `export default defineNuxtConfig({
        runtimeConfig: {
          apiSecret: process.env.API_SECRET,
        },
      });`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'API_SECRET=ok');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).not.toContain('useRuntimeConfig()');
  });

  it('includes sensitive NUXT_PUBLIC_ warnings in JSON output', () => {
    const cwd = tmpDir();
    makeNuxtProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'server/api/code.ts'),
      `export default defineEventHandler(() => {
        return process.env.NUXT_PUBLIC_API_SECRET;
      });`,
    );

    fs.writeFileSync(
      path.join(cwd, '.env'),
      'NUXT_PUBLIC_API_SECRET=secret123',
    );

    const res = runCli(cwd, ['--scan-usage', '--json']);

    expect(res.status).toBe(0);

    const json = JSON.parse(res.stdout);

    expect(json.frameworkWarnings).toBeDefined();
    expect(json.frameworkWarnings.length).toBeGreaterThan(0);

    const warning = json.frameworkWarnings[0];
    expect(warning.variable).toBe('NUXT_PUBLIC_API_SECRET');
    expect(warning.framework).toBe('nuxt');
    expect(warning.reason).toContain(
      'Potential sensitive environment variable exposed to the browser',
    );
  });
});
