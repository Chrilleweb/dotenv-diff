import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { discoverMatrixFiles } from '../../../src/services/matrixDiscovery.js';

describe('discoverMatrixFiles', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matrix-discovery-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it('discovers .env* files including .env.example variants', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, '.env.production'), '');
    fs.writeFileSync(path.join(cwd, '.env.staging'), '');
    fs.writeFileSync(path.join(cwd, '.env.example'), '');

    const result = discoverMatrixFiles(cwd);

    expect(result).toEqual([
      '.env',
      '.env.example',
      '.env.production',
      '.env.staging',
    ]);
  });

  it('sorts .env first regardless of alphabetical order', () => {
    fs.writeFileSync(path.join(cwd, '.env.aaa'), '');
    fs.writeFileSync(path.join(cwd, '.env'), '');

    const result = discoverMatrixFiles(cwd);

    expect(result).toEqual(['.env', '.env.aaa']);
  });

  it('sorts .env first even when it is not the first comparator argument', () => {
    fs.writeFileSync(path.join(cwd, '.env'), '');
    fs.writeFileSync(path.join(cwd, '.env.aaa'), '');
    fs.writeFileSync(path.join(cwd, '.env.zzz'), '');

    // Real readdir on most filesystems already returns these alphabetically
    // (so `.env` always sorts first "naturally"). Force an unsorted input
    // order so the comparator must move `.env` left past another entry,
    // which is the only way it gets called as the first argument.
    const unsortedNames = ['.env.zzz', '.env.aaa', '.env'];
    vi.spyOn(fs, 'readdirSync').mockReturnValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unsortedNames as any,
    );

    const result = discoverMatrixFiles(cwd);

    expect(result).toEqual(['.env', '.env.aaa', '.env.zzz']);
  });

  it('excludes unrelated dotfiles like .envrc', () => {
    fs.writeFileSync(path.join(cwd, '.envrc'), '');
    fs.writeFileSync(path.join(cwd, '.env'), '');

    const result = discoverMatrixFiles(cwd);

    expect(result).toEqual(['.env']);
  });

  it('excludes directories matching the .env* pattern', () => {
    fs.mkdirSync(path.join(cwd, '.env.dir'));
    fs.writeFileSync(path.join(cwd, '.env'), '');

    const result = discoverMatrixFiles(cwd);

    expect(result).toEqual(['.env']);
  });

  it('excludes broken symlinks matching the .env* pattern', () => {
    fs.symlinkSync(
      path.join(cwd, 'does-not-exist'),
      path.join(cwd, '.env.broken-link'),
    );
    fs.writeFileSync(path.join(cwd, '.env'), '');

    const result = discoverMatrixFiles(cwd);

    expect(result).toEqual(['.env']);
  });

  it('returns an empty array when no .env* files exist', () => {
    fs.writeFileSync(path.join(cwd, 'README.md'), '');

    const result = discoverMatrixFiles(cwd);

    expect(result).toEqual([]);
  });
});
