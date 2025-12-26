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

function makeSvelteKitProject(cwd: string) {
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      devDependencies: {
        '@sveltejs/kit': '1.0.0',
      },
    }),
  );

  fs.mkdirSync(path.join(cwd, 'src/routes'), { recursive: true });
}

describe('SvelteKit environment variable usage rules', () => {
  it('warns when using import.meta.env without VITE_ prefix', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.ts'),
      `console.log(import.meta.env.PUBLIC_URL);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `PUBLIC_URL=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      'Variables accessed through import.meta.env must start with "VITE_"',
    );
    expect(res.stdout).toContain('PUBLIC_URL');
  });

  it('does not warn when import.meta.env uses VITE_ prefix correctly', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.ts'),
      `console.log(import.meta.env.VITE_PUBLIC_URL);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `VITE_PUBLIC_URL=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain(
      'Variables accessed through import.meta.env must start with',
    );
  });

  it('warns when using process.env with a VITE_ prefixed variable', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/index.ts'),
      `console.log(process.env.VITE_SECRET);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `VITE_SECRET=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'process.env cannot access VITE_ (client-side) variables',
    );
    expect(res.stdout).toContain('VITE_SECRET');
  });

  it('warns when using $env/static/private with a VITE_ prefixed variable', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app.ts'),
      `import { VITE_KEY } from '$env/static/private/VITE_KEY';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'VITE_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      '$env/static/private variables must not start with "VITE_"',
    );
    expect(res.stdout).toContain('VITE_KEY');
  });

  it('warns when using $env/static/public with a VITE_ prefixed variable', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app.ts'),
      `import { VITE_PUBLIC } from '$env/static/public/VITE_PUBLIC';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'VITE_PUBLIC=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      '$env/static/public variables must not start with "VITE_"',
    );
    expect(res.stdout).toContain('VITE_PUBLIC');
  });

  it('warns about use of $env/dynamic/public', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app.ts'),
      `import { PUBLIC_RUNTIME } from '$env/dynamic/public/PUBLIC_RUNTIME';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PUBLIC_RUNTIME=1');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      '$env/dynamic/public is discouraged — use $env/static/public for build-time safety',
    );
  });

  it('warns when private env vars appear inside .svelte component', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/App.svelte'),
      `<script>
         import { SECRET_KEY } from '$env/static/private/SECRET_KEY';
       </script>`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'Private env vars cannot be used in Svelte components',
    );
    expect(res.stdout).toContain('SECRET_KEY');
  });

  it('warns when using $env/static/private in +page.ts file', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.ts'),
      `import { SECRET_KEY } from '$env/static/private/SECRET_KEY';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'Private env vars should only be used in server files like +page.server.ts',
    );
  });

  it('does not warn when using $env/static/private in +page.server.ts', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.server.ts'),
      `import { SECRET_KEY } from '$env/static/private/SECRET_KEY';

     export function load() {
       return {
         secret: SECRET_KEY
       };
     }`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Private env vars');
    expect(res.stdout).not.toContain('warning');
  });

  it('warns when PUBLIC_ variable is used inside private env import', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/test.ts'),
      `import { PUBLIC_TOKEN } from '$env/static/private/PUBLIC_TOKEN';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PUBLIC_TOKEN=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'PUBLIC_ variables may never be used in private imports',
    );
    expect(res.stdout).toContain('PUBLIC_TOKEN');
  });

  it('does not duplicate warnings when variable is used multiple times', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.ts'),
      `const url1 = import.meta.env.PUBLIC_URL;
const url2 = import.meta.env.PUBLIC_URL;
const url3 = import.meta.env.PUBLIC_URL;`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `PUBLIC_URL=123`);

    const res = runCli(cwd, ['--scan-usage']);

    // Count occurrences of the warning message
    const warningMessage =
      'Variables accessed through import.meta.env must start with "VITE_"';
    const matches = res.stdout.match(new RegExp(warningMessage, 'g'));

    // Should appear exactly 3 times (once per usage), not 6 times (duplicated)
    expect(matches?.length).toBe(3);

    // Verify total usages found
    expect(res.stdout).toContain('Total variables: 3');
  });

  it('Will exit code 1 on strict mode when warnings are present', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.ts'),
      `console.log(import.meta.env.PUBLIC_URL);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `PUBLIC_URL=123`);

    const res = runCli(cwd, ['--scan-usage', '--strict']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain(
      'Variables accessed through import.meta.env must start with "VITE_"',
    );
    expect(res.stdout).toContain('PUBLIC_URL');
  });
});
