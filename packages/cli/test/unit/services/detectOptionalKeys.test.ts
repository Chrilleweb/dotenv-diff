import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectOptionalKeys } from '../../../src/services/detectOptionalKeys.js';

describe('detectOptionalKeys', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'optional-unit-'));
    file = path.join(dir, '.env.example');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = (content: string) => {
    fs.writeFileSync(file, content);
    return detectOptionalKeys(file);
  };

  it('detects a key marked with # @optional', () => {
    expect(run('# @optional\nREDIS_URL=')).toEqual(['REDIS_URL']);
  });

  it('detects a key marked without the @ prefix', () => {
    expect(run('# optional\nREDIS_URL=')).toEqual(['REDIS_URL']);
  });

  it('detects a key marked with a // comment', () => {
    expect(run('// @optional\nREDIS_URL=')).toEqual(['REDIS_URL']);
  });

  it('detects a key marked with a bare annotation', () => {
    expect(run('@optional\nREDIS_URL=')).toEqual(['REDIS_URL']);
  });

  it('is case-insensitive', () => {
    expect(run('# @OPTIONAL\nREDIS_URL=')).toEqual(['REDIS_URL']);
  });

  it('returns nothing for an unannotated file', () => {
    expect(run('DATABASE_URL=\nPORT=3000')).toEqual([]);
  });

  it('applies to the next key only', () => {
    expect(run('# @optional\nFIRST=\nSECOND=')).toEqual(['FIRST']);
  });

  it('still attaches when a documenting comment sits between annotation and key', () => {
    expect(run('# @optional\n# falls back to memory\nREDIS_URL=')).toEqual([
      'REDIS_URL',
    ]);
  });

  it('attaches when the annotation sits below a documenting comment', () => {
    expect(run('# falls back to memory\n# @optional\nREDIS_URL=')).toEqual([
      'REDIS_URL',
    ]);
  });

  it('does not leak across a blank line', () => {
    expect(run('# @optional\n\nREDIS_URL=')).toEqual([]);
  });

  it('does not mark a key when the annotation carries extra prose', () => {
    // Only a standalone annotation counts, mirroring `@expire` parsing.
    expect(run('# @optional but ask the team first\nREDIS_URL=')).toEqual([]);
  });

  it('collects every annotated key in the file', () => {
    const content = [
      '# @optional',
      'REDIS_URL=',
      '',
      'DATABASE_URL=',
      '',
      '# @optional',
      'SENTRY_DSN=',
    ].join('\n');
    expect(run(content)).toEqual(['REDIS_URL', 'SENTRY_DSN']);
  });

  it('creates nothing when no key follows the annotation', () => {
    expect(run('DATABASE_URL=\n# @optional\n')).toEqual([]);
  });

  it('returns nothing when the file does not exist', () => {
    // Callers pass a default path that may simply not be there, so a missing
    // example file must not throw — it just means nothing is marked optional.
    expect(detectOptionalKeys(path.join(dir, 'nope.example'))).toEqual([]);
  });

  it('returns nothing when the path is not a readable file', () => {
    // A directory (or any unreadable path) fails safe the same way: every key
    // stays required rather than the run blowing up.
    expect(detectOptionalKeys(dir)).toEqual([]);
  });
});
