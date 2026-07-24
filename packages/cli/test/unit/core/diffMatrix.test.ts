import { describe, expect, it } from 'vitest';
import { diffMatrix } from '../../../src/core/diffMatrix.js';

describe('diffMatrix', () => {
  it('marks a key present in every file as matching', () => {
    const result = diffMatrix([
      { name: '.env.production', values: { A: '1' } },
      { name: '.env.staging', values: { A: '2' } },
    ]);

    expect(result.files).toEqual(['.env.production', '.env.staging']);
    expect(result.rows).toEqual([
      {
        key: 'A',
        presence: [true, true],
        values: ['1', '2'],
        hasMismatch: false,
      },
    ]);
    expect(result.allMatch).toBe(true);
  });

  it('flags keys missing from some files and sets allMatch to false', () => {
    const result = diffMatrix([
      { name: '.env.production', values: { A: '1', B: '1' } },
      { name: '.env.staging', values: { A: '2' } },
    ]);

    expect(result.rows).toEqual([
      {
        key: 'A',
        presence: [true, true],
        values: ['1', '2'],
        hasMismatch: false,
      },
      {
        key: 'B',
        presence: [true, false],
        values: ['1', undefined],
        hasMismatch: false,
      },
    ]);
    expect(result.allMatch).toBe(false);
  });

  it('does not compute mismatches when checkValues is false (default)', () => {
    const result = diffMatrix([
      { name: '.env.production', values: { A: '1' } },
      { name: '.env.staging', values: { A: '2' } },
    ]);

    expect(result.rows[0]!.hasMismatch).toBe(false);
    expect(result.allMatch).toBe(true);
  });

  it('flags value mismatches when checkValues is true', () => {
    const result = diffMatrix(
      [
        { name: '.env.production', values: { A: '1' } },
        { name: '.env.staging', values: { A: '2' } },
      ],
      true,
    );

    expect(result.rows[0]!.hasMismatch).toBe(true);
    expect(result.allMatch).toBe(false);
  });

  it('does not flag a mismatch when the key is missing from other files', () => {
    const result = diffMatrix(
      [
        { name: '.env.production', values: { A: '1' } },
        { name: '.env.staging', values: {} },
      ],
      true,
    );

    expect(result.rows[0]!.hasMismatch).toBe(false);
    expect(result.allMatch).toBe(false);
  });

  it('does not flag a mismatch when values match across files that define the key', () => {
    const result = diffMatrix(
      [
        { name: '.env.production', values: { A: '1' } },
        { name: '.env.staging', values: { A: '1' } },
        { name: '.env.example', values: {} },
      ],
      true,
    );

    expect(result.rows[0]!.hasMismatch).toBe(false);
    expect(result.allMatch).toBe(false);
  });

  it('sorts rows alphabetically by key', () => {
    const result = diffMatrix([
      { name: '.env.production', values: { Z: '1', A: '1', M: '1' } },
    ]);

    expect(result.rows.map((r) => r.key)).toEqual(['A', 'M', 'Z']);
  });

  it('returns an empty matrix when files have no keys', () => {
    const result = diffMatrix([
      { name: '.env.production', values: {} },
      { name: '.env.staging', values: {} },
    ]);

    expect(result.rows).toEqual([]);
    expect(result.allMatch).toBe(true);
  });

  it('does not report a prototype-named key as present in files that omit it', () => {
    // Regression: `toString` is inherited from Object.prototype, so `key in
    // values` / `values[key]` used to report phantom presence (and leak the
    // inherited function as the value) for the file that never defined it.
    const result = diffMatrix(
      [
        { name: 'a.env', values: { toString: 'foo' } },
        { name: 'b.env', values: { OTHER: 'x' } },
      ],
      true,
    );

    const row = result.rows.find((r) => r.key === 'toString')!;
    expect(row.presence).toEqual([true, false]);
    expect(row.values).toEqual(['foo', undefined]);
    expect(row.hasMismatch).toBe(false);
  });

  it('treats a shared prototype-named key like any other matching key', () => {
    const result = diffMatrix(
      [
        { name: 'a.env', values: { constructor: '1', valueOf: 'x' } },
        { name: 'b.env', values: { constructor: '1', valueOf: 'x' } },
      ],
      true,
    );

    expect(result.allMatch).toBe(true);
    for (const row of result.rows) {
      expect(row.presence).toEqual([true, true]);
      expect(row.values.every((v) => typeof v === 'string')).toBe(true);
    }
  });

  it('supports comparing 3+ files at once', () => {
    const result = diffMatrix([
      { name: '.env.production', values: { DATABASE_URL: 'a', API_KEY: 'k' } },
      { name: '.env.staging', values: { DATABASE_URL: 'b' } },
      { name: '.env.example', values: { DATABASE_URL: '', API_KEY: '' } },
    ]);

    expect(result.files).toEqual([
      '.env.production',
      '.env.staging',
      '.env.example',
    ]);
    const apiKeyRow = result.rows.find((r) => r.key === 'API_KEY');
    expect(apiKeyRow?.presence).toEqual([true, false, true]);
  });
});
