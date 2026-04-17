import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { discoverEnvFiles } from '../../../src/services/envDiscovery.js';

describe('discoverEnvFiles', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'env-discovery-'));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it('discovers .env files and prefers .env as primary', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, '.env.local'), '');
    fs.writeFileSync(path.join(cwd, '.env.example'), '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: null,
    });

    expect(result.envFiles).toEqual(['.env', '.env.local']);
    expect(result.primaryEnv).toBe('.env');
    expect(result.primaryExample).toBe('.env.example');
    expect(result.alreadyWarnedMissingEnv).toBe(false);
  });

  it('falls back to first env file when .env does not exist', () => {
    fs.writeFileSync(path.join(cwd, '.env.local'), '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: null,
    });

    expect(result.primaryEnv).toBe('.env.local');
  });

  it('handles --env flag and finds matching example via suffix', () => {
    fs.writeFileSync(path.join(cwd, '.env.prod'), '');
    fs.writeFileSync(path.join(cwd, '.env.example.prod'), '');

    const envPath = path.join(cwd, '.env.prod');
    const result = discoverEnvFiles({
      cwd,
      envFlag: envPath,
      exampleFlag: null,
    });

    expect(result.primaryEnv).toBe(envPath);
    expect(result.primaryExample).toBe('.env.example.prod');
    expect(result.envFiles[0]).toBe(envPath);
  });

  it('handles --example flag and finds matching env via suffix', () => {
    fs.writeFileSync(path.join(cwd, '.env.staging'), '');
    fs.writeFileSync(path.join(cwd, '.env.example.staging'), '');
    const examplePath = path.join(cwd, '.env.example.staging');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: examplePath,
    });

    expect(result.primaryExample).toBe(examplePath);
    expect(result.primaryEnv).toBe('.env.staging');
    expect(result.envFiles).toEqual(['.env.staging']);
  });

  it('sets alreadyWarnedMissingEnv when example has no matching env', () => {
    const examplePath = path.join(cwd, '.env.example.prod');
    fs.writeFileSync(examplePath, '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: examplePath,
    });

    expect(result.alreadyWarnedMissingEnv).toBe(true);
    expect(result.primaryExample).toBe(examplePath);
  });

  it('uses first available env file when --example has no matching env but other env files exist', () => {
    fs.writeFileSync(path.join(cwd, '.env.local'), '');
    const examplePath = path.join(cwd, '.env.example.prod');
    fs.writeFileSync(examplePath, '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: examplePath,
    });

    expect(result.primaryEnv).toBe('.env.local');
    expect(result.primaryExample).toBe(examplePath);
    expect(result.alreadyWarnedMissingEnv).toBe(false);
    expect(result.envFiles).toEqual(['.env.local']);
  });

  it('uses non-standard example file as-is', () => {
    const examplePath = path.join(cwd, 'custom.example');
    fs.writeFileSync(examplePath, '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: examplePath,
    });

    expect(result.primaryExample).toBe(examplePath);
    expect(result.envFiles.length).toBe(1);
  });

  it('adds --env file to envFiles when it exists on disk', () => {
    fs.writeFileSync(path.join(cwd, '.env.custom'), '');

    const envPath = path.join(cwd, '.env.custom');
    const result = discoverEnvFiles({
      cwd,
      envFlag: envPath,
      exampleFlag: null,
    });

    expect(result.envFiles[0]).toBe(envPath);
  });

  it('handles --env .env without suffix', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, '.env.example'), '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: path.join(cwd, '.env'),
      exampleFlag: null,
    });

    expect(result.primaryExample).toBe('.env.example');
  });

  it('sorts env files alphabetically when .env is not present', () => {
    fs.writeFileSync(path.join(cwd, '.env.zeta'), '');
    fs.writeFileSync(path.join(cwd, '.env.alpha'), '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: null,
    });

    expect(result.envFiles).toEqual(['.env.alpha', '.env.zeta']);
  });

  it('handles --env flag when the env file does not exist', () => {
    const envPath = path.join(cwd, '.env.missing');
    const result = discoverEnvFiles({
      cwd,
      envFlag: envPath,
      exampleFlag: null,
    });

    expect(result.primaryEnv).toBe(envPath);
    expect(result.envFiles.includes(envPath)).toBe(false);
  });

  it('handles non-standard example file that does not start with .env.example', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');
    const examplePath = path.join(cwd, 'my-custom.env');
    fs.writeFileSync(examplePath, '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: examplePath,
    });

    expect(result.primaryExample).toBe(examplePath);
    expect(result.primaryEnv).toBe('.env');
    expect(result.envFiles).toContain('.env');
  });

  it('prioritizes DEFAULT_ENV_FILE when sorting', () => {
    fs.writeFileSync(path.join(cwd, '.env.local'), '');
    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, '.env.example'), '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: null,
      exampleFlag: null,
    });

    expect(result.envFiles[0]).toBe('.env');
  });

  it('preserves full path when --env points to a nested subdirectory', () => {
    const subDir = path.join(cwd, 'config');
    fs.mkdirSync(subDir);
    const envPath = path.join(subDir, '.env.prod');
    fs.writeFileSync(envPath, '');

    const result = discoverEnvFiles({
      cwd,
      envFlag: envPath,
      exampleFlag: null,
    });

    expect(result.primaryEnv).toBe(envPath);
    expect(result.envFiles[0]).toBe(envPath);
  });
});
