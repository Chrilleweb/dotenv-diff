import { describe, it, expect } from 'vitest';
import { createProgram } from '../../../src/cli/program.js';

describe('createProgram', () => {
  it('creates a commander program with expected metadata', () => {
    const program = createProgram();

    expect(program.name()).toBe('dotenv-diff');
    expect(program.description()).toBe('Compare .env and .env.example files');
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
});
