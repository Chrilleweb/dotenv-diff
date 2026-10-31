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
 * Minimal Strapi project with config files using the env() helper
 */
function makeStrapiProject(cwd: string) {
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify({ dependencies: { '@strapi/strapi': '5.58.0' } }),
  );
  fs.mkdirSync(path.join(cwd, 'config'), { recursive: true });

  fs.writeFileSync(
    path.join(cwd, 'config/server.js'),
    `module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: { keys: env.array('APP_KEYS') },
});`,
  );

  fs.writeFileSync(
    path.join(cwd, 'config/admin.ts'),
    `import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: { secret: env('ADMIN_JWT_SECRET') },
  flags: { nps: env.bool('FLAG_NPS', true) },
});

export default config;`,
  );
}

describe('Strapi env() helper', () => {
  it('does not report keys read through env() as unused (issue example)', () => {
    const cwd = tmpDir();
    makeStrapiProject(cwd);

    const keys =
      'HOST=0.0.0.0\nAPP_KEYS=a,b\nADMIN_JWT_SECRET=s\nFLAG_NPS=true\n';
    fs.writeFileSync(path.join(cwd, '.env'), keys);
    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      keys + 'REALLY_UNUSED=x\n',
    );

    const res = runCli(cwd, ['--example', '.env.example', '--json']);
    const json = JSON.parse(res.stdout);

    expect(json.unused).toEqual(['REALLY_UNUSED']);
    expect(json.missing ?? []).toEqual([]);
  });

  it('reports keys read through env() that are missing from .env', () => {
    const cwd = tmpDir();
    makeStrapiProject(cwd);

    fs.writeFileSync(
      path.join(cwd, '.env'),
      'HOST=0.0.0.0\nAPP_KEYS=a,b\nFLAG_NPS=true\n',
    );

    const res = runCli(cwd, ['--json']);
    const json = JSON.parse(res.stdout);

    expect(json.missing).toEqual([
      expect.objectContaining({
        variable: 'ADMIN_JWT_SECRET',
        usages: [expect.objectContaining({ pattern: 'strapi' })],
      }),
    ]);
  });
});
