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

describe('Inconsistent Naming Warnings', () => {
  it('warns about inconsistent naming patterns like API_KEY vs APIKEY', () => {
    const cwd = tmpDir();

    // Create .env with some values
    fs.writeFileSync(
      path.join(cwd, '.env'),
      `API_KEY=secret1\nAPIKEY=secret2\nDATABASE_URL=url\nVALID_KEY=valid\n`,
    );

    // Create .env.example with inconsistent naming
    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      `APIKEY=\nAPI_KEY=\nDATABASE_URL=\nVALID_KEY=\n`,
    );

    // Create a file that uses these env vars
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'process.env.API_KEY, process.env.APIKEY, process.env.DATABASE_URL, process.env.VALID_KEY;',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Inconsistent naming found');
    expect(res.stdout).toContain(
      'Suggested canonical name: API_KEY',
    );
  });

  it('warns about multiple inconsistent patterns in the same file', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      `API_KEY=\nAPIKEY=\nDATABASE_URL=\nDATABASEURL=\nJWT_SECRET=\nJWTSECRET=\nVALID_KEY=\n`,
    );

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.API_KEY);',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Inconsistent naming found');
    expect(res.stdout).toContain(
      'Suggested canonical name: API_KEY',
    );
    expect(res.stdout).toContain(
      'Suggested canonical name: DATABASE_URL',
    );
    expect(res.stdout).toContain(
      'Suggested canonical name: JWT_SECRET',
    );
  });

  it('does not warn when all names are consistent', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      `API_KEY=\nDATABASE_URL=\nJWT_SECRET=\nVALID_KEY=\n`,
    );

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.API_KEY, process.env.DATABASE_URL, process.env.JWT_SECRET, process.env.VALID_KEY);',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Inconsistent naming found');
  });

  it('is case sensitive - does not warn for different cases if underscores match', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      `API_KEY=\napi_key=\nDATABASE_URL=\n`, // Different cases but both have underscores
    );

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.API_KEY, process.env.api_key, process.env.DATABASE_URL);',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Inconsistent naming found');
    expect(res.stdout).toContain(
      'Suggested canonical name: API_KEY',
    );
  });

  it('exits with error in strict mode when inconsistent naming exists', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env.example'), `API_KEY=\nAPIKEY=\n`);

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.API_KEY, process.env.APIKEY);',
    );

    const res = runCli(cwd, ['--strict']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Inconsistent naming found');
    expect(res.stdout).toContain(
      'Suggested canonical name: API_KEY',
    );
    expect(res.stdout).toContain('inconsistent naming patterns');
  });

  it('Will disable inconsistent naming warnings when config is set to false', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, 'dotenv-diff.config.json'),
      `{
        "inconsistentNamingWarnings": false
      }`,
    );

    fs.writeFileSync(path.join(cwd, '.env.example'), `API_KEY=\nAPIKEY=\n`);

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.API_KEY, process.env.APIKEY);',
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Inconsistent naming found');
  });
});
