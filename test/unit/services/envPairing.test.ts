import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { envPairing } from '../../../src/services/envPairing.js';
import type { Discovery } from '../../../src/config/types.js';

describe('pairWithExample', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pair-example-'));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it('pairs each env file with its matching example file by suffix', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, '.env.local'), '');
    fs.writeFileSync(path.join(cwd, '.env.example'), '');
    fs.writeFileSync(path.join(cwd, '.env.example.local'), '');

    const d: Discovery = {
      cwd,
      envFiles: ['.env', '.env.local'],
      primaryEnv: '.env',
      primaryExample: '.env.example',
      envFlag: null,
      exampleFlag: null,
      alreadyWarnedMissingEnv: false,
    };

    const result = envPairing(d);

    expect(result).toEqual([
      {
        envName: '.env',
        envPath: path.resolve(cwd, '.env'),
        examplePath: path.resolve(cwd, '.env.example'),
      },
      {
        envName: '.env.local',
        envPath: path.resolve(cwd, '.env.local'),
        examplePath: path.resolve(cwd, '.env.example.local'),
      },
    ]);
  });

  it('falls back to primary example when suffix example does not exist', () => {
    fs.writeFileSync(path.join(cwd, '.env.prod'), '');
    fs.writeFileSync(path.join(cwd, '.env.example'), '');

    const d: Discovery = {
      cwd,
      envFiles: ['.env.prod'],
      primaryEnv: '.env.prod',
      primaryExample: '.env.example',
      envFlag: null,
      exampleFlag: null,
      alreadyWarnedMissingEnv: false,
    };

    const result = envPairing(d);

    expect(result[0].examplePath).toBe(path.resolve(cwd, '.env.example'));
  });

  it('uses explicit example flag when provided without env flag', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, 'custom.example'), '');

    const d: Discovery = {
      cwd,
      envFiles: ['.env'],
      primaryEnv: '.env',
      primaryExample: 'custom.example',
      envFlag: null,
      exampleFlag: path.join(cwd, 'custom.example'),
      alreadyWarnedMissingEnv: false,
    };

    const result = envPairing(d);

    expect(result[0].examplePath).toBe(path.resolve(cwd, 'custom.example'));
  });

  it('skips pairing when env and example resolve to the same file', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');

    const d: Discovery = {
      cwd,
      envFiles: ['.env'],
      primaryEnv: '.env',
      primaryExample: '.env',
      envFlag: null,
      exampleFlag: path.join(cwd, '.env'),
      alreadyWarnedMissingEnv: false,
    };

    const result = envPairing(d);

    expect(result).toEqual([]);
  });

  it('uses primaryEnv when envFiles list is empty', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, '.env.example'), '');

    const d: Discovery = {
      cwd,
      envFiles: [],
      primaryEnv: '.env',
      primaryExample: '.env.example',
      envFlag: null,
      exampleFlag: null,
      alreadyWarnedMissingEnv: false,
    };

    const result = envPairing(d);

    expect(result).toHaveLength(1);
    expect(result[0].envName).toBe('.env');
  });
});
