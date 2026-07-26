import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectMissingComments } from '../../../src/services/detectMissingComments.js';

describe('detectMissingComments', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comments-unit-'));
    file = path.join(dir, '.env.example');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = (content: string) => {
    fs.writeFileSync(file, content);
    return detectMissingComments(file);
  };

  it('accepts a key documented by a comment on the line above', () => {
    expect(run('# Stripe secret\nSTRIPE_KEY=')).toEqual([]);
  });

  it('accepts a key documented by an inline comment', () => {
    expect(run('PORT=3000 # server port')).toEqual([]);
  });

  it('reports a bare key with no comment', () => {
    expect(run('API_KEY=')).toEqual([{ key: 'API_KEY', line: 1 }]);
  });

  it('reports each undocumented key with its line number', () => {
    const content = ['# Database', 'DB_HOST=', 'DB_PORT=', 'SECRET=abc'].join(
      '\n',
    );
    // DB_HOST is documented (comment above); DB_PORT and SECRET are not.
    expect(run(content)).toEqual([
      { key: 'DB_PORT', line: 3 },
      { key: 'SECRET', line: 4 },
    ]);
  });

  it('ignores blank lines and comment lines themselves', () => {
    expect(run('\n# just a note\n\n')).toEqual([]);
  });

  it('does not treat a blank line between a comment and a key as documentation', () => {
    // The line directly above the key is blank, not a comment.
    expect(run('# note\n\nAPI_KEY=')).toEqual([{ key: 'API_KEY', line: 3 }]);
  });
});
