import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { findConfigFile } from '../../../../src/core/helpers/findConfigFile.js';

describe('findConfigFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'find-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the path when the config file exists in the given directory', () => {
    const file = 'dotenv-diff.config.json';
    fs.writeFileSync(path.join(tmpDir, file), '{}');

    const result = findConfigFile(tmpDir, file);

    expect(result).toBe(path.resolve(tmpDir, file));
  });

  it('finds the config file in a parent directory', () => {
    const file = 'dotenv-diff.config.json';
    fs.writeFileSync(path.join(tmpDir, file), '{}');

    const child = path.join(tmpDir, 'subdir');
    fs.mkdirSync(child);

    const result = findConfigFile(child, file);

    expect(result).toBe(path.resolve(tmpDir, file));
  });

  it('finds the config file multiple levels up', () => {
    const file = 'dotenv-diff.config.json';
    fs.writeFileSync(path.join(tmpDir, file), '{}');

    const deep = path.join(tmpDir, 'a', 'b', 'c');
    fs.mkdirSync(deep, { recursive: true });

    const result = findConfigFile(deep, file);

    expect(result).toBe(path.resolve(tmpDir, file));
  });

  it('returns null when the config file does not exist anywhere in the tree', () => {
    const child = path.join(tmpDir, 'subdir');
    fs.mkdirSync(child);

    const result = findConfigFile(child, 'nonexistent.config.json');

    expect(result).toBeNull();
  });

  it('prefers the config file in the starting directory over a parent one', () => {
    const file = 'dotenv-diff.config.json';
    fs.writeFileSync(path.join(tmpDir, file), '{"root":true}');

    const child = path.join(tmpDir, 'subdir');
    fs.mkdirSync(child);
    fs.writeFileSync(path.join(child, file), '{"child":true}');

    const result = findConfigFile(child, file);

    expect(result).toBe(path.resolve(child, file));
  });

  it('works with different file names', () => {
    const file = 'dotenv-diff.baseline.json';
    fs.writeFileSync(path.join(tmpDir, file), '{}');

    const result = findConfigFile(tmpDir, file);

    expect(result).toBe(path.resolve(tmpDir, file));
  });

  it('returns null when starting from a directory with no ancestors containing the file', () => {
    // Use a real path that definitely won't have the file
    const result = findConfigFile(
      os.tmpdir(),
      '__nonexistent_config_xyz__.json',
    );
    expect(result).toBeNull();
  });
});
