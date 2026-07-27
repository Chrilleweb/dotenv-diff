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

  it('does not treat a bare @expire annotation above a key as documentation', () => {
    // An `@expire` annotation is a machine hint, not human docs, so the key
    // below it is still undocumented and must be reported.
    expect(run('# @expire 2025-12-12\nAPI_KEY=')).toEqual([
      { key: 'API_KEY', line: 2 },
    ]);
  });

  it('does not treat a bare expire annotation (no @) above a key as documentation', () => {
    expect(run('# expire 2025-12-12\nAPI_KEY=')).toEqual([
      { key: 'API_KEY', line: 2 },
    ]);
  });

  it('treats a comment that adds prose alongside an expire annotation as documentation', () => {
    // The comment carries real information beyond the annotation, so it counts.
    expect(run('# @expire 2025-12-12 rotate before then\nAPI_KEY=')).toEqual(
      [],
    );
  });

  it('accepts a key whose line directly above is a real comment, even with an expire annotation earlier', () => {
    // Mirrors the user scenario: annotation, then a documenting comment, then
    // the key. The line directly above the key is a real comment.
    expect(
      run('# @expire 2025-12-12\n# what this key is for\nAPI_KEY='),
    ).toEqual([]);
  });

  it('sees a real comment above an @expire annotation that sits directly on the key', () => {
    // The annotation is transparent: a real comment above it still documents
    // the key, even though the annotation is the line immediately above.
    expect(
      run('# Stripe webhook secret\n# @expire 2026-12-31\nSTRIPE_KEY='),
    ).toEqual([]);
  });

  it('sees a real comment above a bare (no #) @expire annotation', () => {
    expect(run('# Expiring secret\n@expire 2025-12-31\nOLD_API_KEY=')).toEqual(
      [],
    );
  });

  it('sees a real comment above a // style @expire annotation', () => {
    expect(run('# legacy token\n// @expire 2024-01-01\nLEGACY=')).toEqual([]);
  });

  it('still reports a key when only annotations (no prose) sit above it', () => {
    // Two annotations and nothing else — no human documentation, so reported.
    expect(run('# @expire 2026-01-01\n# @expire 2026-02-01\nAPI_KEY=')).toEqual(
      [{ key: 'API_KEY', line: 3 }],
    );
  });

  it('does not let a comment leak across a blank line above the annotation', () => {
    // Blank line ends the run, so the comment does not document ORPHAN.
    expect(run('# note\n\n# @expire 2026-01-01\nORPHAN=')).toEqual([
      { key: 'ORPHAN', line: 4 },
    ]);
  });

  it('does not carry a comment across an intervening key line', () => {
    // `# doc` documents FIRST; SECOND has a key line directly above it.
    expect(run('# doc\nFIRST=1\nSECOND=2')).toEqual([
      { key: 'SECOND', line: 3 },
    ]);
  });
});
