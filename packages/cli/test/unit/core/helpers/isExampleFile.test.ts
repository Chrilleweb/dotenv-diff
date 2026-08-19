import { describe, it, expect } from 'vitest';
import { isExampleFile } from '../../../../src/core/helpers/isExampleFile.js';

describe('isExampleFile', () => {
  it.each(['.env.example', '.env-example', '.env.sample', '.env.template'])(
    'accepts %s',
    (name) => {
      expect(isExampleFile(name)).toBe(true);
    },
  );

  it('matches case-insensitively', () => {
    expect(isExampleFile('.ENV.Example')).toBe(true);
  });

  it.each(['.env', '.env.local', '.env.production', 'env.example', 'README'])(
    'rejects %s',
    (name) => {
      expect(isExampleFile(name)).toBe(false);
    },
  );

  it('rejects a suffixed variant by default', () => {
    expect(isExampleFile('.env.example.production')).toBe(false);
  });

  it('accepts a suffixed variant with withSuffix', () => {
    expect(isExampleFile('.env.example.production', { withSuffix: true })).toBe(
      true,
    );
    expect(isExampleFile('.env.sample.local', { withSuffix: true })).toBe(true);
  });

  it('does not treat a longer word as a suffix', () => {
    // `.env.examples` is a different name, not `.env.example` plus a suffix.
    expect(isExampleFile('.env.examples', { withSuffix: true })).toBe(false);
  });

  it('still rejects plain env files with withSuffix', () => {
    expect(isExampleFile('.env.local', { withSuffix: true })).toBe(false);
  });
});
