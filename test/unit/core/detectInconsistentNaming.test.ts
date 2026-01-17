import { describe, it, expect } from 'vitest';
import { detectInconsistentNaming } from '../../../src/core/detectInconsistentNaming.js';

describe('detectInconsistentNaming', () => {
  it('detects multiple inconsistencies', () => {
    const keys = [
      'API_KEY',
      'APIKEY',
      'DATABASE_URL',
      'DATABASEURL',
      'JWT_SECRET',
      'JWTSECRET',
    ];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(3);

    const pairs = warnings.map((w) => [w.key1, w.key2].sort());
    expect(pairs).toContainEqual(['APIKEY', 'API_KEY']);
    expect(pairs).toContainEqual(['DATABASEURL', 'DATABASE_URL']);
    expect(pairs).toContainEqual(['JWTSECRET', 'JWT_SECRET']);
  });

  it('does not warn for consistent naming', () => {
    const keys = ['API_KEY', 'DATABASE_URL', 'JWT_SECRET'];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(0);
  });

  it('does not warn for completely different keys', () => {
    const keys = ['API_KEY', 'REDIS_HOST', 'SMTP_PASSWORD'];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(0);
  });

  it('handles empty input', () => {
    const keys: string[] = [];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(0);
  });

  it('handles single key', () => {
    const keys = ['API_KEY'];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(0);
  });

  it('detects case-sensitive inconsistencies', () => {
    const keys = ['API_KEY', 'api_key'];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].key1).toBe('API_KEY');
    expect(warnings[0].key2).toBe('api_key');
  });

  it('does not create duplicate warnings for same pair', () => {
    const keys = ['API_KEY', 'APIKEY', 'DATABASE_URL'];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(1);
  });

  it('skips undefined keys in the array', () => {
    const keys = ['API_KEY', undefined, 'APIKEY', undefined] as any[];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].key1).toBe('API_KEY');
    expect(warnings[0].key2).toBe('APIKEY');
  });

  it('suggests snake_case key when key1 has underscores', () => {
    const keys = ['API_KEY', 'APIKEY'];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].suggestion).toContain('API_KEY');
  });

  it('suggests snake_case key when key2 has underscores', () => {
    const keys = ['APIKEY', 'API_KEY'];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].suggestion).toContain('API_KEY');
  });

  it('avoids duplicate warnings when same key appears multiple times', () => {
    const keys = ['API_KEY', 'APIKEY', 'API_KEY'];
    const warnings = detectInconsistentNaming(keys);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].key1).toBe('API_KEY');
    expect(warnings[0].key2).toBe('APIKEY');
  });
});
