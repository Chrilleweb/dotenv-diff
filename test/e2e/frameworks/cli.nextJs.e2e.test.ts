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
 * Minimal Next.js project so detectFramework() → "next"
 */
function makeNextProject(cwd: string) {
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: {
        next: '14.0.0',
      },
    }),
  );

  fs.mkdirSync(path.join(cwd, 'app'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'components'), { recursive: true });
}

describe('Next.js environment variable usage rules', () => {
  // Server-only using NEXT_PUBLIC_ → forbidden
  it('warns when NEXT_PUBLIC_ variables are used inside server-only files', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.mkdirSync(path.join(cwd, 'app/api/test'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'app/api/test/route.ts'),
      `export async function GET() {
         console.log(process.env.NEXT_PUBLIC_URL);
       }`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `NEXT_PUBLIC_URL=abc`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      `NEXT_PUBLIC_ variables are exposed to the browser — don't use them in server-only files`,
    );
    expect(res.stdout).toContain('NEXT_PUBLIC_URL');
  });

  // Client component using server-only env → forbidden
  it('warns when non-NEXT_PUBLIC_ env vars are used inside client components', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'components/Button.tsx'),
      `console.log(process.env.SECRET_KEY);
       "use client";`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `SECRET_KEY=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'process.env inside client components must use NEXT_PUBLIC_ variables',
    );
    expect(res.stdout).toContain('SECRET_KEY');
  });

  // Client React file accessing process.env.* without NEXT_PUBLIC_
  it('warns when process.env is used inside .tsx client code without NEXT_PUBLIC_', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'components/Card.tsx'),
      `"use client";
       console.log(process.env.API_SECRET);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `API_SECRET=xyz`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'process.env inside client components must use NEXT_PUBLIC_ variables',
    );
    expect(res.stdout).toContain('API_SECRET');
  });

  // Server file using server env correctly → no warnings
  it('does NOT warn when server env vars are used in server-only files', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.mkdirSync(path.join(cwd, 'app/api/data'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'app/api/data/route.ts'),
      `export async function GET() {
         console.log(process.env.SECRET_SERVER_KEY);
       }`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `SECRET_SERVER_KEY=ok`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).not.toContain('Client components');
    expect(res.stdout).not.toContain('NEXT_PUBLIC_ variables are exposed');
  });

  // should fail strict mode
  it('exits with code 1 in --strict mode when Next.js warnings exist', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'components/Test.tsx'),
      `"use client";
       console.log(process.env.SUPER_SECRET);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `SUPER_SECRET=1`);

    const res = runCli(cwd, ['--scan-usage', '--strict']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain(
      'process.env inside client components must use NEXT_PUBLIC_ variables',
    );
  });
});
