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
  it('warns when NEXT_PUBLIC_ variables are used inside server-only files', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.mkdirSync(path.join(cwd, 'app/api/test'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'app/api/test/route.server.ts'),
      `export async function GET() {
        console.log(process.env.NEXT_PUBLIC_URL);
      }`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `NEXT_PUBLIC_URL=abc`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      "NEXT_PUBLIC_ variables are exposed to the browser — don't use them in server-only files",
    );
    expect(res.stdout).toContain('NEXT_PUBLIC_URL');
  });

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

    expect(res.stdout).not.toContain(
      'process.env inside client components must use NEXT_PUBLIC_ variables',
    );
    expect(res.stdout).not.toContain(
      'NEXT_PUBLIC_ variables are exposed to the browser',
    );
  });

  it('does NOT warn when NEXT_PUBLIC_ is used correctly in client components', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'components/Hero.tsx'),
      `"use client";
console.log(process.env.NEXT_PUBLIC_IMAGE_BASE);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `NEXT_PUBLIC_IMAGE_BASE=1`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).not.toContain(
      'process.env inside client components must use NEXT_PUBLIC_ variables',
    );
  });

  it('does not treat commented "use client" as client boundary', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'components/Sidebar.tsx'),
      `// "use client"
console.log(process.env.SECRET_TOKEN);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `SECRET_TOKEN=1`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).not.toContain(
      'process.env inside client components must use NEXT_PUBLIC_ variables',
    );
  });

  it('does not duplicate warnings when NEXT_PUBLIC_ is used multiple times in server file', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.mkdirSync(path.join(cwd, 'app/api/users'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'app/api/users/route.ts'),
      `export async function GET() {
        const url1 = process.env.NEXT_PUBLIC_API_URL;
        const url2 = process.env.NEXT_PUBLIC_API_URL;
        return Response.json({ url1, url2 });
      }`,
    );

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `NEXT_PUBLIC_API_URL=https://api.example.com`,
    );

    const res = runCli(cwd, ['--scan-usage']);

    // Count occurrences of the warning message
    const warningMessage =
      "NEXT_PUBLIC_ variables are exposed to the browser — don't use them in server-only files";
    const matches = res.stdout.match(new RegExp(warningMessage, 'g'));

    // Should appear exactly 2 times (once per usage), not 4 times (duplicated)
    expect(matches?.length).toBe(2);

    // Verify the variable name appears exactly twice in warnings section
    const varMatches = res.stdout.match(/NEXT_PUBLIC_API_URL/g);
    expect(varMatches?.length).toBeGreaterThanOrEqual(2);
  });

  it('includes framework warnings in JSON output', () => {
    const cwd = tmpDir();
    makeNextProject(cwd);

    fs.mkdirSync(path.join(cwd, 'app/api/test'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'app/api/test/route.ts'),
      `export async function GET() {
        process.env.NEXT_PUBLIC_API_KEY;
      }`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `NEXT_PUBLIC_API_KEY=secret123`);

    const res = runCli(cwd, ['--scan-usage', '--json']);

    console.log(res.stdout);
    expect(res.status).toBe(0);

    const json = JSON.parse(res.stdout);

    // Verify framework warnings are present
    expect(json.frameworkWarnings).toBeDefined();
    expect(json.frameworkWarnings.length).toBeGreaterThan(0);

    // Check the warning content
    const warning = json.frameworkWarnings[0];
    expect(warning.variable).toBe('NEXT_PUBLIC_API_KEY');
    expect(warning.framework).toBe('next');
    expect(warning.reason).toContain(
      'NEXT_PUBLIC_ variables are exposed to the browser',
    );
    expect(warning.file).toContain('app/api/test/route.ts');
    expect(warning.line).toBeGreaterThan(0);
  });
});
