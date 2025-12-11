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

/**
 * Minimal t3-env project setup
 */
function makeT3EnvProject(cwd: string) {
  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
  
  fs.writeFileSync(
    path.join(cwd, 'src', 'env.ts'),
    `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    SECRET_KEY: z.string(),
    ADMIN_EMAIL: z.string(),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string(),
    NEXT_PUBLIC_SITE_NAME: z.string(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SECRET_KEY: process.env.SECRET_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  },
});`
  );

  fs.writeFileSync(
    path.join(cwd, '.env'),
    `DATABASE_URL=postgresql://localhost:5432/db
SECRET_KEY=secret123
ADMIN_EMAIL=admin@test.com
NEXT_PUBLIC_API_URL=https://api.test.com
NEXT_PUBLIC_SITE_NAME=Test Site`
  );
}

describe('t3-env warnings', () => {
  it('should detect server variable used in client code', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.mkdirSync(path.join(cwd, 'src', 'components'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'components', 'ClientComponent.tsx'),
      `import React from 'react';

export function ClientComponent() {
  // Should warn: using server variable in client code
  const dbUrl = process.env.DATABASE_URL;
  
  return <div>Client Component</div>;
}`
    );

    const res = runCli(cwd, []);
    
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('T3-env validation issues');
    expect(res.stdout).toContain('DATABASE_URL');
    expect(res.stdout).toContain('Use t3-env client schema instead of NEXT_PUBLIC_ prefix for type-safe environment variables.');
  });

  it('should detect client variable used in server code', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.mkdirSync(path.join(cwd, 'src', 'pages', 'api'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'pages', 'api', 'users.ts'),
      `import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Should warn: using client variable in server code
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME;
  
  res.json({ success: true });
}`
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('T3-env validation issues');
    expect(res.stdout).toContain('NEXT_PUBLIC_SITE_NAME');
    expect(res.stdout).toContain('Use t3-env client schema instead of NEXT_PUBLIC_ prefix for type-safe environment variables.');
  });

  it('should detect undefined variables not in schema', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'test.js'),
      `const unknownVar = process.env.UNDEFINED_VAR;`
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain('T3-env validation issues');
    expect(res.stdout).toContain('UNDEFINED_VAR');
    expect(res.stdout).toContain('Variable "UNDEFINED_VAR" is not defined in t3-env schema. Add it to either server or client schema.');
  });

  it('should warn about NEXT_PUBLIC_ usage in t3-env projects', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.mkdirSync(path.join(cwd, 'src', 'lib'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'lib', 'client.ts'),
      `export const config = {
  apiUrl: process.env.NEXT_PUBLIC_OLD_API_URL,
};`
    );

    const res = runCli(cwd, ['--scan-usage', '--t3env']);
    
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('T3-env validation issues');
    expect(res.stdout).toContain('NEXT_PUBLIC_OLD_API_URL');
    expect(res.stdout).toContain('is not defined in t3-env schema. Add it to either server or client schema.');
  });

  it('should not show t3-env warnings when t3env flag is disabled', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src', 'test.js'),
      `const key = process.env.UNDEFINED_VAR;`
    );

    const res = runCli(cwd, ['--scan-usage', '--no-t3env']);
    
    expect(res.stdout).not.toContain('T3-env validation issues');
    expect(res.stdout).not.toContain('not defined in t3-env schema');
  });

  it('should work with env.mjs files', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, 'env.mjs'),
      `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string(),
  },
});`
    );

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'test.js'),
      `// Should warn: server var in client context
const dbUrl = process.env.DATABASE_UPSURL;`
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'DATABASE_URL=test');

    const res = runCli(cwd, ['--scan-usage', '--t3env']);
    console.log(res.stdout);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('T3-env validation issues');
    expect(res.stdout).toContain('DATABASE_URL');
    expect(res.stdout).toContain('Variable "DATABASE_UPSURL" is not defined in t3-env schema. Add it to either server or client schema.');
  });

  it('should handle JSON output format', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'test.js'),
      `const test = process.env.UNDEFINED_VAR;`
    );

    const res = runCli(cwd, ['--json']);
    expect(res.status).toBe(1);
    const output = JSON.parse(res.stdout);
    expect(output.t3EnvWarnings).toBeDefined();
    expect(output.t3EnvWarnings.length).toBeGreaterThan(0);
  });

  it('should detect when no t3-env config exists', () => {
    const cwd = tmpDir();

    // No env.ts file - should not detect t3-env
    fs.writeFileSync(
      path.join(cwd, 'test.js'),
      `const test = process.env.ANY_VAR;`
    );

    fs.writeFileSync(path.join(cwd, '.env'), '');

    const res = runCli(cwd, ['--scan-usage', '--t3env']);
    
    expect(res.stdout).not.toContain('T3-env validation issues');
  });
});

