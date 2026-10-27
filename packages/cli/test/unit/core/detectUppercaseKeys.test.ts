import { describe, it, expect } from 'vitest';
import { detectUppercaseKeys } from '../../../src/core/detectUppercaseKeys.js';

describe('detectUppercaseKeys', () => {
  it('returns no warnings for UPPER_SNAKE_CASE keys', () => {
    expect(detectUppercaseKeys(['API_KEY', 'PORT', 'S3_BUCKET_2'])).toEqual([]);
  });

  it('warns about keys that are not UPPER_SNAKE_CASE, with a suggestion', () => {
    expect(detectUppercaseKeys(['apiKey', 'API_KEY', 'db-url'])).toEqual([
      { key: 'apiKey', suggestion: 'API_KEY' },
      { key: 'db-url', suggestion: 'DB_URL' },
    ]);
  });

  it('returns no warnings for an empty list', () => {
    expect(detectUppercaseKeys([])).toEqual([]);
  });
});
