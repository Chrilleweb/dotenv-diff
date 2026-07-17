import { describe, it, expect } from 'vitest';
import { filterIgnoredKeys } from '../../../../src/core/helpers/filterIgnoredKeys.js';

describe('filterIgnoredKeys', () => {
  it('filters exact and regex matches', () => {
    const keys = ['API_KEY', 'SESSION_ID', 'SECRET_TOKEN', 'DEBUG'];
    const ignore = ['API_KEY'];
    const regex = [/^SECRET_/];
    const res = filterIgnoredKeys(keys, ignore, regex);
    expect(res).toEqual(['SESSION_ID', 'DEBUG']);
  });

  it('handles overlap between ignore and regex', () => {
    const keys = ['A', 'B'];
    const ignore = ['B'];
    const regex = [/B/];
    const res = filterIgnoredKeys(keys, ignore, regex);
    expect(res).toEqual(['A']);
  });

  it('returns original keys when no ignores provided', () => {
    const keys = ['FOO', 'BAR'];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(keys);
  });

  it('always filters out DEFAULT_EXCLUDE_KEYS', () => {
    const keys = [
      'PWD',
      'API_KEY',
      'NODE_ENV',
      'MODE',
      'BASE_URL',
      'PROD',
      'DEV',
      'SSR',
      'DB_URL',
    ];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(['API_KEY', 'DB_URL']);
  });

  it('filters combination of ignore list, regex, and DEFAULT_EXCLUDE_KEYS', () => {
    const keys = [
      'API_KEY',
      'NODE_ENV',
      'SECRET_TOKEN',
      'MODE',
      'DEBUG',
      'PWD',
    ];
    const ignore = ['DEBUG'];
    const regex = [/^SECRET_/];
    const res = filterIgnoredKeys(keys, ignore, regex);
    expect(res).toEqual(['API_KEY']);
    expect(res).not.toContain('NODE_ENV');
    expect(res).not.toContain('MODE');
    expect(res).not.toContain('PWD');
  });

  it('Will ignore CI, SLOW_MO and GITHUB_ACTIONS by default', () => {
    const keys = ['CI', 'SLOW_MO', 'GITHUB_ACTIONS', 'API_KEY'];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(['API_KEY']);
  });

  it('ignores CI-injected variables via default regex prefixes', () => {
    const keys = [
      'GITHUB_REF_NAME',
      'GITHUB_SHA',
      'RUNNER_OS',
      'VERCEL_ENV',
      'CI_COMMIT_SHA',
      'CIRCLE_BRANCH',
      'API_KEY',
    ];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(['API_KEY']);
  });

  it('ignores generic CI provider flags by default', () => {
    const keys = ['VERCEL', 'NETLIFY', 'GITLAB_CI', 'CIRCLECI', 'API_KEY'];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(['API_KEY']);
  });

  it('default regex prefixes are case-sensitive and only match the start', () => {
    const keys = [
      'github_ref_name', // lowercase — not a real CI var, keep it
      'MY_GITHUB_TOKEN', // prefix appears mid-string, not at start — keep it
      'GITHUBBER', // shares letters but no underscore boundary — keep it
      'GITHUB_SHA', // real match — drop it
    ];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(['github_ref_name', 'MY_GITHUB_TOKEN', 'GITHUBBER']);
  });

  it('does not over-match user keys that merely resemble defaults', () => {
    const keys = [
      'NODE_ENVIRONMENT', // superstring of NODE_ENV — keep it
      'CIRCLE', // no underscore, not the CIRCLECI flag — keep it
      'MY_CI', // ^CI_ only matches at start — keep it
      'VERCELLING', // ^VERCEL_ needs the underscore — keep it
      'PORT_NUMBER', // superstring of PORT — keep it
    ];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(keys);
  });

  it('handles an empty key list', () => {
    expect(filterIgnoredKeys([], ['FOO'], [/BAR/])).toEqual([]);
  });

  it('preserves duplicate keys that are not ignored', () => {
    const keys = ['API_KEY', 'API_KEY', 'CI'];
    const res = filterIgnoredKeys(keys, [], []);
    expect(res).toEqual(['API_KEY', 'API_KEY']);
  });

  it('applies user regex on top of the default excludes', () => {
    const keys = ['GITHUB_SHA', 'FEATURE_FLAG_A', 'FEATURE_FLAG_B', 'API_KEY'];
    const res = filterIgnoredKeys(keys, [], [/^FEATURE_FLAG_/]);
    expect(res).toEqual(['API_KEY']);
  });

  it('combines user ignore list, user regex, and both default exclude sources', () => {
    const keys = [
      'API_KEY', // survives
      'DEBUG', // user ignore list
      'SECRET_TOKEN', // user regex
      'CI', // default exact
      'VERCEL_URL', // default regex
    ];
    const res = filterIgnoredKeys(keys, ['DEBUG'], [/^SECRET_/]);
    expect(res).toEqual(['API_KEY']);
  });
});
