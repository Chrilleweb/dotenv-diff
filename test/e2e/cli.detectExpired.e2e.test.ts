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

describe('Expiration Warnings', () => {
  it('warns about expired environment variables', () => {
    const cwd = tmpDir();

    // Create .env with an expired variable (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expiredDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `# @expire ${expiredDate}\nEXPIRED_API_KEY=secret123\n\nVALID_KEY=value456\n`,
    );

    // Create a file that uses these env vars
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.EXPIRED_API_KEY, process.env.VALID_KEY);',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Expiration warnings');
    expect(res.stdout).toContain('EXPIRED_API_KEY');
    expect(res.stdout).toContain('EXPIRED');
  });

  it('warns about soon-to-expire environment variables', () => {
    const cwd = tmpDir();

    // Create .env with a variable expiring in 3 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const expiringDate = futureDate.toISOString().split('T')[0];

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `# @expire ${expiringDate}\nSOON_EXPIRED_KEY=secret789\n\nVALID_KEY=value123\n`,
    );

    // Create a file that uses these env vars
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.SOON_EXPIRED_KEY, process.env.VALID_KEY);',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Expiration warnings');
    expect(res.stdout).toContain('SOON_EXPIRED_KEY');
    expect(res.stdout).toContain('expires in 3 days');
  });

  it('does not warn when no expiration comments are present', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `API_KEY=secret123\nVALID_KEY=value456\n`,
    );

    // Create a file that uses these env vars
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.API_KEY, process.env.VALID_KEY);',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain(
      'Environment variables with expiration dates',
    );
    expect(res.stdout).not.toContain('expired');
  });

  it('handles multiple expiration patterns correctly', () => {
    const cwd = tmpDir();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expiredDate = yesterday.toISOString().split('T')[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const validDate = futureDate.toISOString().split('T')[0];

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `# @expire ${expiredDate}\nOLD_TOKEN=expired123\n\n# This one is still valid\n# @expire ${validDate}\nNEW_TOKEN=valid456\n\nNO_EXPIRY=permanent\n`,
    );

    // Create a file that uses these env vars
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.OLD_TOKEN, process.env.NEW_TOKEN, process.env.NO_EXPIRY);',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Expiration warnings');
    expect(res.stdout).toContain('OLD_TOKEN');
    expect(res.stdout).toContain('NEW_TOKEN');
    expect(res.stdout).toContain('EXPIRED');
    expect(res.stdout).toContain('expires in 7 days');
  });

  it('does not warn about expiration when --no-expire-warnings is used', () => {
    const cwd = tmpDir();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expiredDate = yesterday.toISOString().split('T')[0];

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `# @expire ${expiredDate}\nEXPIRED_KEY=secret123\n\nVALID_KEY=value456\n`,
    );

    // Create a file that uses these env vars
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.EXPIRED_KEY, process.env.VALID_KEY);',
    );

    const res = runCli(cwd, ['--no-expire-warnings']);

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Expiration warnings');
  });

  it('supports different comment styles for expiration', () => {
    const cwd = tmpDir();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expiredDate = yesterday.toISOString().split('T')[0];

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `// @expire ${expiredDate}\nJS_STYLE_KEY=value1\n\n# @expire ${expiredDate}\nSHELL_STYLE_KEY=value2\n\n@expire ${expiredDate}\nNO_COMMENT_KEY=value3\n`,
    );

    // Create a file that uses these env vars
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.JS_STYLE_KEY, process.env.SHELL_STYLE_KEY, process.env.NO_COMMENT_KEY);',
    );

    const res = runCli(cwd, []);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Expiration warnings');
    expect(res.stdout).toContain('JS_STYLE_KEY');
    expect(res.stdout).toContain('SHELL_STYLE_KEY');
    expect(res.stdout).toContain('NO_COMMENT_KEY');
  });

  it('exits with error in strict mode when expired variables exist', () => {
    const cwd = tmpDir();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expiredDate = yesterday.toISOString().split('T')[0];

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `# @expire ${expiredDate}\nEXPIRED_KEY=secret123\n`,
    );

    // Create a file that uses the env var
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.js'),
      'console.log(process.env.EXPIRED_KEY);',
    );

    const res = runCli(cwd, ['--strict']);

    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Expiration warnings');
    expect(res.stdout).toContain('EXPIRED_KEY');
    expect(res.stdout).toContain('EXPIRED');
  });
});
