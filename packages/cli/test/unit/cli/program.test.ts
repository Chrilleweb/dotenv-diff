import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { createProgram } from '../../../src/cli/program.js';

const pkg = JSON.parse(
  fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as { version: string };

describe('createProgram', () => {
  it('creates a commander program with expected metadata', () => {
    const program = createProgram();

    expect(program.name()).toBe('dotenv-diff');
    expect(program.description()).toBe(
      'Scan your codebase for environment variable usage and compare .env files',
    );
    expect(program.version()).toBe(pkg.version);
  });

  it('parses key CLI options correctly', () => {
    const program = createProgram();

    program.parse([
      'node',
      'dotenv-diff',
      '--compare',
      '--json',
      '--env',
      '.env.local',
      '--example',
      '.env.example.local',
      '--no-color',
      '--strict',
    ]);

    const opts = program.opts();

    expect(opts.compare).toBe(true);
    expect(opts.json).toBe(true);
    expect(opts.env).toBe('.env.local');
    expect(opts.example).toBe('.env.example.local');
    expect(opts.color).toBe(false);
    expect(opts.strict).toBe(true);
  });

  it('ignores extra positional arguments', () => {
    const program = createProgram();

    expect(() => {
      program.parse([
        'node',
        'dotenv-diff',
        '--compare',
        '--example',
        '.env.example',
        'file1.ts',
        'file2.ts',
      ]);
    }).not.toThrow();

    const opts = program.opts();
    expect(opts.compare).toBe(true);
    expect(opts.example).toBe('.env.example');
  });
});
