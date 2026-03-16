import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { findDuplicateKeys } from '../../../src/core/duplicates.js';

describe('findDuplicateKeys', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'duplicates-'));
    filePath = path.join(tmpDir, '.env');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array if file does not exist', () => {
    const result = findDuplicateKeys(path.join(tmpDir, 'missing.env'));
    expect(result).toEqual([]);
  });

  it('returns empty array for empty file', () => {
    fs.writeFileSync(filePath, '');
    const result = findDuplicateKeys(filePath);
    expect(result).toEqual([]);
  });

  it('ignores comments and empty lines', () => {
    fs.writeFileSync(
      filePath,
      `
        # This is a comment

        # Another comment

      `,
    );

    const result = findDuplicateKeys(filePath);
    expect(result).toEqual([]);
  });

  it('ignores lines without "=" or with empty keys', () => {
    fs.writeFileSync(
      filePath,
      `
        INVALID
        =value
        =another
        #FOO=bar
      `,
    );

    const result = findDuplicateKeys(filePath);
    expect(result).toEqual([]);
  });

  it('detects duplicate keys and returns correct counts', () => {
    fs.writeFileSync(
      filePath,
      `
        FOO=one
        BAR=two
        FOO=three
        FOO=four
        BAR=five
      `,
    );

    const result = findDuplicateKeys(filePath);

    expect(result).toEqual(
      expect.arrayContaining([
        { key: 'FOO', count: 3 },
        { key: 'BAR', count: 2 },
      ]),
    );
  });

  it('trims keys before counting duplicates', () => {
    fs.writeFileSync(
      filePath,
      `
        FOO =one
        FOO=two
        FOO   =three
      `,
    );

    const result = findDuplicateKeys(filePath);

    expect(result).toEqual([{ key: 'FOO', count: 3 }]);
  });

  it('splits only on the first "="', () => {
    fs.writeFileSync(
      filePath,
      `
        DATABASE_URL=postgres://user:pass@localhost:5432/db
        DATABASE_URL=postgres://user:pass@localhost:5432/db2
      `,
    );

    const result = findDuplicateKeys(filePath);

    expect(result).toEqual([{ key: 'DATABASE_URL', count: 2 }]);
  });

  it('handles UTF-8 BOM correctly', () => {
    // \uFEFF = BOM
    fs.writeFileSync(filePath, '\uFEFFFOO=one\nFOO=two\n', 'utf8');

    const result = findDuplicateKeys(filePath);

    expect(result).toEqual([{ key: 'FOO', count: 2 }]);
  });

  it('does not include keys that appear only once', () => {
    fs.writeFileSync(
      filePath,
      `
      FOO=one
      BAR=two
    `,
    );

    const result = findDuplicateKeys(filePath);
    expect(result).toEqual([]);
  });
});
