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
 * Minimal t3-env project
 */
function makeT3EnvProject(cwd: string) {
  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });

  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify(
      {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@t3-oss/env-nextjs': '^0.7.0',
          zod: '^3.22.0',
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(cwd, 'src', 'env.ts'),
    `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    SECRET_KEY: z.string(),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SECRET_KEY: process.env.SECRET_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});`,
  );

  fs.writeFileSync(
    path.join(cwd, '.env'),
    `DATABASE_URL=postgres://localhost:5432/db
SECRET_KEY=secret
NEXT_PUBLIC_API_URL=https://api.test.com`,
  );
}

describe('t3-env warnings', () => {
  it('warns about NEXT_PUBLIC_ usage in t3-env projects', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/test.ts'),
      `console.log(process.env.NEXT_PUBLIC_OLD_API_URL);`,
    );

    const res = runCli(cwd, ['--scan-usage', '--t3env']);

    expect(res.stdout).toContain('T3-env validation issues');
    expect(res.stdout).toContain('NEXT_PUBLIC_OLD_API_URL');
    expect(res.stdout).toContain(
      'Use t3-env client schema instead of NEXT_PUBLIC_ prefix for type-safe environment variables.',
    );
  });

  it('detects variables not defined in schema', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/test.ts'),
      `console.log(process.env.UNKNOWN_VAR);`,
    );

    const res = runCli(cwd, ['--scan-usage', '--t3env']);

    expect(res.stdout).toContain('T3-env validation issues');
    expect(res.stdout).toContain(
      'Variable "UNKNOWN_VAR" is not defined in t3-env schema',
    );
  });

  it('does not warn when t3-env is disabled', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/test.ts'),
      `console.log(process.env.UNKNOWN_VAR);`,
    );

    const res = runCli(cwd, ['--scan-usage', '--no-t3env']);

    expect(res.stdout).not.toContain('T3-env validation issues');
  });

  it('fails in strict mode when t3-env warnings exist', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/test.ts'),
      `console.log(process.env.UNKNOWN_VAR);`,
    );

    const res = runCli(cwd, ['--scan-usage', '--t3env', '--strict']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain('T3-env validation issues');
  });

  it('ignores env.ts definition file', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    const res = runCli(cwd, ['--scan-usage', '--t3env']);

    expect(res.stdout).not.toContain('env.ts');
    expect(res.stdout).not.toContain('NEXT_PUBLIC_API_URL (src/env.ts');
  });

  it('does not duplicate warnings when variable is used multiple times', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/test.ts'),
      `const var1 = process.env.UNKNOWN_VAR;
const var2 = process.env.UNKNOWN_VAR;
const var3 = process.env.UNKNOWN_VAR;
console.log(var1, var2, var3);`,
    );

    const res = runCli(cwd, ['--scan-usage', '--t3env']);

    // Count occurrences of the specific warning for UNKNOWN_VAR
    const warningMessage =
      'Variable "UNKNOWN_VAR" is not defined in t3-env schema';
    const matches = res.stdout.match(new RegExp(warningMessage, 'g'));

    // Should appear exactly 1 time, not 3 times (one per usage)
    expect(matches?.length).toBe(1);
    expect(res.stdout).toMatch(/Total (usages found|variables): 6/);
  });

  it('shows one warning per variable across multiple files', () => {
    const cwd = tmpDir();
    makeT3EnvProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/file1.ts'),
      `console.log(process.env.UNKNOWN_VAR);`,
    );

    fs.writeFileSync(
      path.join(cwd, 'src/file2.ts'),
      `console.log(process.env.UNKNOWN_VAR);`,
    );

    fs.writeFileSync(
      path.join(cwd, 'src/file3.ts'),
      `console.log(process.env.UNKNOWN_VAR);`,
    );

    const res = runCli(cwd, ['--scan-usage', '--t3env']);

    // Count occurrences of the specific warning for UNKNOWN_VAR
    const warningMessage =
      'Variable "UNKNOWN_VAR" is not defined in t3-env schema';
    const matches = res.stdout.match(new RegExp(warningMessage, 'g'));

    // Should appear exactly 1 time even though it's in 3 different files
    expect(matches?.length).toBe(1);
  });

  it('detects env.ts in root directory', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, 'package.json'),
      JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            '@t3-oss/env-nextjs': '^0.7.0',
            zod: '^3.22.0',
          },
        },
        null,
        2,
      ),
    );

    // env.ts in ROOT directory (not src/)
    fs.writeFileSync(
      path.join(cwd, 'env.ts'),
      `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    ROOT_SERVER_VAR: z.string(),
  },
  client: {
    NEXT_PUBLIC_ROOT_CLIENT: z.string(),
  },
  runtimeEnv: {
    ROOT_SERVER_VAR: process.env.ROOT_SERVER_VAR,
    NEXT_PUBLIC_ROOT_CLIENT: process.env.NEXT_PUBLIC_ROOT_CLIENT,
  },
});`,
    );

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `ROOT_SERVER_VAR=test\nNEXT_PUBLIC_ROOT_CLIENT=test`,
    );

    fs.writeFileSync(
      path.join(cwd, 'test.ts'),
      `console.log(process.env.UNDEFINED_VAR);`,
    );

    const res = runCli(cwd, ['--scan-usage', '--t3env']);

    // Should detect t3-env and show warning
    expect(res.stdout).toContain('T3-env validation issues');
    expect(res.stdout).toContain('UNDEFINED_VAR');
    expect(res.stdout).toContain('not defined in t3-env schema');
  });
});
