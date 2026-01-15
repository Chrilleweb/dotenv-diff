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
      'process.env should only be used in server files',
    );
    expect(res.stdout).toContain('VITE_SECRET');
  });

  it('warns when using $env/static/private with a VITE_ prefixed variable', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app.ts'),
      `import { VITE_KEY } from '$env/static/private';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'VITE_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      '$env/static/private variables must not start with "PUBLIC_" or "VITE_"',
    );
    expect(res.stdout).toContain('VITE_KEY');
  });

  it('warns when using $env/static/public with a VITE_ prefixed variable', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/app.ts'),
      `import { VITE_PUBLIC } from '$env/static/public';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'VITE_PUBLIC=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      '$env/static/public variables must start with "PUBLIC_"',
    );
    expect(res.stdout).toContain('VITE_PUBLIC');
  });

  it('warns when private env vars appear inside .svelte component', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/App.svelte'),
      `<script>
         import { SECRET_KEY } from '$env/static/private';
       </script>`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'Private env vars cannot be used in client-side code',
    );
    expect(res.stdout).toContain('SECRET_KEY');
  });

  it('warns when using $env/static/private in +page.svelte file', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.svelte'),
      `import { SECRET_KEY } from '$env/static/private';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'Private env vars cannot be used in client-side code',
    );
  });

  it('does not warn when using $env/static/private in +page.server.ts', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.server.ts'),
      `import { SECRET_KEY } from '$env/static/private';

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
      `import { PUBLIC_TOKEN } from '$env/static/private';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PUBLIC_TOKEN=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      '$env/static/private variables must not start with "PUBLIC_"',
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
    expect(res.stdout).toContain('Total variable references: 3');
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

  it('Will warn in server file when using import.meta.env', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.server.ts'),
      `console.log(import.meta.env.SECRET_KEY);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `SECRET_KEY=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'Variables accessed through import.meta.env must start with "VITE_"',
    );
    expect(res.stdout).toContain('SECRET_KEY');
  });

  it('Will warn about +server.ts files using import.meta.env', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+server.ts'),
      `console.log(import.meta.env.API_KEY);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), `API_KEY=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'Variables accessed through import.meta.env must start with "VITE_"',
    );
    expect(res.stdout).toContain('API_KEY');
  });

  it('warns when using $env/dynamic/private inside a .svelte component', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.svelte'),
      `<script>
      import { env } from '$env/dynamic/private';
      console.log(env.SECRET);
    </script>`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      '$env/dynamic/private cannot be used in client files',
    );
  });

  it('does warn when using $env/static/private in +page.svelte file', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.svelte'),
      `import SECRET_KEY from '$env/static/private';`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.stdout).toContain(
      'Private env vars cannot be used in client-side code',
    );
  });

  it('does not warn when using $env/dynamic/private in +page.server.ts', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.server.ts'),
      `import { env } from '$env/dynamic/private';

     export function load() {
       return {
         secret: env.SECRET
       };
     }`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Private env vars');
    expect(res.stdout).not.toContain('warning');
  });

  it('does not warn when using $env/dynamic/private in server file', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/api.ts'),
      `import { env } from '$env/dynamic/private';
      
      console.log(env.SECRET);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Private env vars');
    expect(res.stdout).not.toContain('warning');
  });

  it('allows $env/dynamic/public in client files', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.svelte'),
      `<script>
      import { env } from '$env/dynamic/public';
      console.log(env.PUBLIC_KEY);
    </script>`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PUBLIC_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('warning');
  });

  it('allows $env/dynamic/public in server files', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/api.ts'),
      `import { env } from '$env/dynamic/public';
      
      console.log(env.PUBLIC_KEY);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PUBLIC_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('warning');
  });

  it('allows $env/static/public in client files', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/+page.svelte'),
      `<script>
      import { PUBLIC_KEY } from '$env/static/public';
      console.log(PUBLIC_KEY);
    </script>`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PUBLIC_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('warning');
  });

  it('allows $env/static/public in server files', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/routes/api.ts'),
      `import { PUBLIC_KEY } from '$env/static/public';
      
      console.log(PUBLIC_KEY);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PUBLIC_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('warning');
  });

  it('allows $env/dynamic/private i hooks.server.ts', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/hooks.server.ts'),
      `import { env } from '$env/dynamic/private';
      
      console.log(env.SECRET);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('warning');
  });

  it('allows $env/dynamic/public in hooks.client.ts', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/hooks.client.ts'),
      `import { env } from '$env/dynamic/public';
      
      console.log(env.PUBLIC_KEY);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'PUBLIC_KEY=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('warning');
  });

  it('allows $env/dynamic/private in servers file', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/server.ts'),
      `import { env } from '$env/dynamic/private';
      
      console.log(env.SECRET);`,
    );

    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET=123');

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('warning');
  });

  it('Will not warn when proccess.env is used in server file', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/+server.ts'),
      `console.log(process.env.SECRET_KEY);`,
    );
    fs.writeFileSync(path.join(cwd, '.env'), `SECRET_KEY=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain(
      'process.env should only be used in server files',
    );
  });

  it('Will not warn when proccess.env is used in hooks.server.ts', () => {
    const cwd = tmpDir();
    makeSvelteKitProject(cwd);

    fs.writeFileSync(
      path.join(cwd, 'src/hooks.server.ts'),
      `console.log(process.env.SECRET_KEY);`,
    );
    fs.writeFileSync(path.join(cwd, '.env'), `SECRET_KEY=123`);

    const res = runCli(cwd, ['--scan-usage']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain(
      'process.env should only be used in server files',
    );
  });
});
