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
 * Makes a minimal Angular project so detectFramework() returns `angular`
 */
function makeAngularProject(cwd: string) {
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: {
        "@angular/core": "17.0.0"
      }
    })
  );

  fs.mkdirSync(path.join(cwd, 'src/app'), { recursive: true });
}

describe('Angular environment variable usage rules', () => {

  it('warns when process.env is used inside Angular component files', () => {
    const cwd = tmpDir();
    makeAngularProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app/home.component.ts'),
      `console.log(process.env.API_KEY);`
    );

    fs.writeFileSync(path.join(cwd, '.env'), `API_KEY=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      `Avoid using process.env directly in Angular components`
    );
    expect(res.stdout).toContain('API_KEY');
  });

  it('warns when using CLIENT_ or BROWSER_ and suggests NG_APP_', () => {
    const cwd = tmpDir();
    makeAngularProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app/home.component.ts'),
      `console.log(process.env.CLIENT_URL);`
    );

    fs.writeFileSync(path.join(cwd, '.env'), `CLIENT_URL=abc`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain('Use NG_APP_ prefix for Angular client-side variables');
    expect(res.stdout).toContain('CLIENT_URL');
  });

  it('does NOT warn when process.env is inside environment.ts (valid Angular pattern)', () => {
    const cwd = tmpDir();
    makeAngularProject(cwd);
    fs.mkdirSync(path.join(cwd, 'src/environments'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src/environments/environment.ts'),
      `export const environment = {
         api: process.env.API_URL
       };`
    );

    fs.writeFileSync(path.join(cwd, '.env'), `API_URL=http://test`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).not.toContain('Don\'t use process.env directly');
  });

  it('Will exit with code 1 in --strict mode when Angular warnings exist', () => {
    const cwd = tmpDir();
    makeAngularProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app/home.component.ts'),
      `console.log(process.env.API_KEY);`
    );

    fs.writeFileSync(path.join(cwd, '.env'), `API_KEY=123`);

    const res = runCli(cwd, ['--scan-usage', '--strict']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain("Avoid using process.env directly in Angular components");
  });
});
