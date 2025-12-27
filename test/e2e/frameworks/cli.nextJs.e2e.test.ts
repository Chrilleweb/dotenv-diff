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
  it('warns when non-NEXT_PUBLIC_ variables are used in client components', () => {
  const cwd = tmpDir();
  makeNextProject(cwd);

  fs.writeFileSync(
    path.join(cwd, 'components/ClientTest.tsx'),
    `"use client";

export default function ClientTest() {
  return (
    <div>
      <p>Database: {process.env.DATABASE_URL}</p>
      <p>Secret: {process.env.SECRET_KEY}</p>
    </div>
  );
}`,
  );

  fs.writeFileSync(
    path.join(cwd, '.env'),
    `DATABASE_URL=postgresql://localhost:5432/mydb
SECRET_KEY=my-secret`,
  );

  const res = runCli(cwd, ['--scan-usage']);

  expect(res.stdout).toContain(
    'Client components must use NEXT_PUBLIC_ prefix for environment variables to be accessible in the browser',
  );
  expect(res.stdout).toContain('DATABASE_URL');
  expect(res.stdout).toContain('SECRET_KEY');
});

it('warns for each non-NEXT_PUBLIC_ variable used in client component', () => {
  const cwd = tmpDir();
  makeNextProject(cwd);

  fs.writeFileSync(
    path.join(cwd, 'app/client-page.tsx'),
    `'use client';

export default function Page() {
  const db = process.env.DATABASE_URL;
  const secret = process.env.SECRET_KEY;
  const api = process.env.API_ENDPOINT;
  
  return <div>{db} {secret} {api}</div>;
}`,
  );

  fs.writeFileSync(
    path.join(cwd, '.env'),
    `DATABASE_URL=db
SECRET_KEY=secret
API_ENDPOINT=api`,
  );

  const res = runCli(cwd, ['--scan-usage']);
  console.log(res.stdout);

  // Should warn for all three variables
  expect(res.stdout).toContain('DATABASE_URL');
  expect(res.stdout).toContain('SECRET_KEY');
  expect(res.stdout).toContain('API_ENDPOINT');
  
  const warningMessage = 'Client components must use NEXT_PUBLIC_ prefix';
  const matches = res.stdout.match(new RegExp(warningMessage, 'g'));
  
  expect(matches?.length).toBe(3);
});

it('does not warn when server components use non-NEXT_PUBLIC_ variables', () => {
  const cwd = tmpDir();
  makeNextProject(cwd);

  // Server component (no "use client")
  fs.writeFileSync(
    path.join(cwd, 'app/page.tsx'),
    `export default async function Page() {
  const db = process.env.DATABASE_URL;
  
  return <div>{db}</div>;
}`,
  );

  fs.writeFileSync(path.join(cwd, '.env'), `DATABASE_URL=postgresql://...`);

  const res = runCli(cwd, ['--scan-usage']);

  expect(res.stdout).not.toContain(
    'Client components must use NEXT_PUBLIC_ prefix',
  );
});
});
