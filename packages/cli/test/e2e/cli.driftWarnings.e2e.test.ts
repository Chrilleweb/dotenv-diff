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

/**
 * Sets up a clean project: every key in `.env` is used in code (but never
 * logged, which would be its own warning) and `.env` is gitignored. The only
 * thing that varies is whether `.env.example` documents the same keys, so drift
 * is the sole variable under test and `--strict` is otherwise satisfied.
 */
function setup(envBody: string, exampleBody: string | null) {
  const cwd = makeTmpDir();
  tmpDirs.push(cwd);
  fs.writeFileSync(path.join(cwd, '.gitignore'), '.env\n');
  fs.writeFileSync(path.join(cwd, '.env'), envBody);
  if (exampleBody !== null) {
    fs.writeFileSync(path.join(cwd, '.env.example'), exampleBody);
  }
  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, 'src', 'index.js'),
    'export const db = process.env.DB_URL;\nexport const key = process.env.STRIPE_SECRET;\n',
  );
  return cwd;
}

const DRIFTED_ENV = 'DB_URL=postgres://x\nSTRIPE_SECRET=sk_test\n';
const PARTIAL_EXAMPLE = 'DB_URL=\n';

describe('Drift Warnings (--no-drift-warnings)', () => {
  it('warns by default about a key in .env that is missing from .env.example', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    const res = runCli(cwd, ['--no-color']);

    expect(res.stdout).toContain('Drift between .env and .env.example');
    expect(res.stdout).toContain('STRIPE_SECRET');
    // DB_URL is documented in the example, so it must not be listed
    expect(res.stdout).not.toContain('DB_URL');
  });

  it('is a warning, not a failure, without --strict', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    const res = runCli(cwd, ['--no-color']);

    expect(res.status).toBe(0);
  });

  it('fails the run under --strict', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    const res = runCli(cwd, ['--no-color', '--strict']);

    expect(res.status).toBe(1);
  });

  it('says nothing when .env and .env.example agree', () => {
    const cwd = setup(DRIFTED_ENV, 'DB_URL=\nSTRIPE_SECRET=\n');
    const res = runCli(cwd, ['--no-color']);

    expect(res.stdout).not.toContain('Drift between');
  });

  it('says nothing when there is no .env.example to drift from', () => {
    const cwd = setup(DRIFTED_ENV, null);
    const res = runCli(cwd, ['--no-color']);

    expect(res.stdout).not.toContain('Drift between');
  });

  it('says nothing when the directory holds only an example file', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    fs.rmSync(path.join(cwd, '.env'));
    const res = runCli(cwd, ['--no-color']);

    expect(res.stdout).not.toContain('Drift between');
  });

  it('checks only the file the scan compared against', () => {
    const cwd = setup(
      'DB_URL=x\nSTRIPE_SECRET=y\n',
      'DB_URL=\nSTRIPE_SECRET=\n',
    );
    fs.writeFileSync(path.join(cwd, '.env.local'), 'LOCAL_ONLY=1\n');

    // The scan compares against .env, so .env.local is not this run's subject.
    const res = runCli(cwd, ['--no-color']);
    expect(res.stdout).not.toContain('Drift between');
    expect(res.stdout).not.toContain('LOCAL_ONLY');
  });

  it('checks .env.local when --env points at it', () => {
    const cwd = setup(
      'DB_URL=x\nSTRIPE_SECRET=y\n',
      'DB_URL=\nSTRIPE_SECRET=\n',
    );
    fs.writeFileSync(path.join(cwd, '.env.local'), 'LOCAL_ONLY=1\n');

    const res = runCli(cwd, ['--no-color', '--env', '.env.local']);
    expect(res.stdout).toContain('Drift between .env.local and .env.example');
    expect(res.stdout).toContain('LOCAL_ONLY');
  });

  it('checks .env.local when no .env exists for the scan to pick', () => {
    // Auto-discovery compares the scan against .env.example itself here, so
    // drift must not depend on which file the scan happened to choose.
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    fs.rmSync(path.join(cwd, '.env'));
    fs.writeFileSync(path.join(cwd, '.env.local'), DRIFTED_ENV);

    const res = runCli(cwd, ['--no-color']);
    expect(res.stdout).toContain('Drift between .env.local and .env.example');
    expect(res.stdout).toContain('STRIPE_SECRET');
  });

  it('can be turned off with --no-drift-warnings', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    const res = runCli(cwd, ['--no-color', '--no-drift-warnings', '--strict']);

    expect(res.stdout).not.toContain('Drift between');
    expect(res.status).toBe(0);
  });

  it('honours --ignore', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    const res = runCli(cwd, ['--no-color', '--ignore', 'STRIPE_SECRET']);

    expect(res.stdout).not.toContain('Drift between');
  });

  it('reports drift under driftWarnings in JSON mode', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    const res = runCli(cwd, ['--json']);
    const output = JSON.parse(res.stdout);

    expect(output.driftWarnings).toEqual([
      {
        key: 'STRIPE_SECRET',
        envFile: '.env',
        exampleFile: '.env.example',
      },
    ]);
  });

  it('omits driftWarnings from JSON when there is no drift', () => {
    const cwd = setup(DRIFTED_ENV, 'DB_URL=\nSTRIPE_SECRET=\n');
    const res = runCli(cwd, ['--json']);
    const output = JSON.parse(res.stdout);

    expect(output.driftWarnings).toBeUndefined();
  });

  it('does not report a key marked @optional in the env file', () => {
    // The annotation applies to the key directly below it.
    const cwd = setup(
      'DB_URL=postgres://x\n# @optional\nSTRIPE_SECRET=sk_test\n',
      PARTIAL_EXAMPLE,
    );
    const res = runCli(cwd, ['--no-color', '--strict']);

    expect(res.stdout).not.toContain('Drift between');
    expect(res.status).toBe(0);
  });

  it('pairs a suffixed env file with its suffixed example', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    fs.rmSync(path.join(cwd, '.env'));
    fs.rmSync(path.join(cwd, '.env.example'));
    fs.writeFileSync(path.join(cwd, '.env.production'), DRIFTED_ENV);
    fs.writeFileSync(
      path.join(cwd, '.env.example.production'),
      PARTIAL_EXAMPLE,
    );

    const res = runCli(cwd, ['--no-color']);
    expect(res.stdout).toContain(
      'Drift between .env.production and .env.example.production',
    );
    expect(res.stdout).toContain('STRIPE_SECRET');
  });

  it('pairs .env.local with a .env.sample', () => {
    const cwd = setup(DRIFTED_ENV, null);
    fs.rmSync(path.join(cwd, '.env'));
    fs.writeFileSync(path.join(cwd, '.env.local'), DRIFTED_ENV);
    fs.writeFileSync(path.join(cwd, '.env.sample'), PARTIAL_EXAMPLE);

    const res = runCli(cwd, ['--no-color']);
    expect(res.stdout).toContain('Drift between .env.local and .env.sample');
    expect(res.stdout).toContain('STRIPE_SECRET');
  });

  it('can be suppressed with a baseline', () => {
    const cwd = setup(DRIFTED_ENV, PARTIAL_EXAMPLE);
    runCli(cwd, ['--baseline']);

    const res = runCli(cwd, ['--no-color', '--strict']);
    expect(res.stdout).not.toContain('Drift between');
    expect(res.status).toBe(0);
  });
});
