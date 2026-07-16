import { describe, it, expect } from 'vitest';
import { suggestTypos } from '../../../src/core/suggestTypos.js';

describe('suggestTypos', () => {
  it('suggests the closest key for a single-character typo', () => {
    const suggestions = suggestTypos(['DATABASE_URL'], ['DATABAS_URL']);

    expect(suggestions).toEqual([
      { key: 'DATABASE_URL', didYouMean: 'DATABAS_URL', distance: 1 },
    ]);
  });

  it('matches separator typos (dash vs underscore)', () => {
    const suggestions = suggestTypos(['DATABASE_URL'], ['DATABASE-URL']);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.didYouMean).toBe('DATABASE-URL');
  });

  it('picks the closest candidate when several are near', () => {
    const suggestions = suggestTypos(
      ['DATABASE_URL'],
      ['DATABASE_URI', 'DATABAS_URL', 'REDIS_URL'],
    );

    // DATABASE_URI and DATABAS_URL are both distance 1; the first seen wins on a tie.
    expect(suggestions[0]?.didYouMean).toBe('DATABASE_URI');
    expect(suggestions[0]?.distance).toBe(1);
  });

  it('does not suggest when nothing is close enough', () => {
    const suggestions = suggestTypos(
      ['DATABASE_URL'],
      ['REDIS_HOST', 'SMTP_PASSWORD'],
    );

    expect(suggestions).toEqual([]);
  });

  it('does not match short, unrelated keys via the length ratio', () => {
    // Distance 2 is within the absolute cap but exceeds the ratio for a 3-char key.
    const suggestions = suggestTypos(['FOO'], ['BAR']);

    expect(suggestions).toEqual([]);
  });

  it('never suggests a candidate identical to the reported key', () => {
    const suggestions = suggestTypos(['API_KEY'], ['API_KEY']);

    expect(suggestions).toEqual([]);
  });

  it('returns one suggestion per reported key', () => {
    const suggestions = suggestTypos(
      ['DATABASE_URL', 'API_KEY'],
      ['DATABAS_URL', 'API_KEZ'],
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions.map((s) => s.didYouMean)).toEqual([
      'DATABAS_URL',
      'API_KEZ',
    ]);
  });

  it('returns an empty array for empty inputs', () => {
    expect(suggestTypos([], ['API_KEY'])).toEqual([]);
    expect(suggestTypos(['API_KEY'], [])).toEqual([]);
  });
});
