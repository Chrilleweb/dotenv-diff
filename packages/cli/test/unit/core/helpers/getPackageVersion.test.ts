import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

vi.mock('../../../../src/core/helpers/findConfigFile.js', () => ({
  findConfigFile: vi.fn(),
}));

import { getPackageVersion } from '../../../../src/core/helpers/getPackageVersion.js';
import { findConfigFile } from '../../../../src/core/helpers/findConfigFile.js';

describe('getPackageVersion', () => {
  beforeEach(() => {
    vi.mocked(findConfigFile).mockReturnValue('/fake/package.json');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the version from package.json', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"version":"1.2.3"}');
    expect(getPackageVersion()).toBe('1.2.3');
  });

  it('returns "unknown" when no package.json is found', () => {
    vi.mocked(findConfigFile).mockReturnValue(null);
    expect(getPackageVersion()).toBe('unknown');
  });

  it.each([
    ['is missing', '{}'],
    ['is not a string', '{"version":123}'],
  ])('returns "unknown" when version %s', (_, json) => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(json);
    expect(getPackageVersion()).toBe('unknown');
  });

  it('returns "unknown" when package.json is not valid JSON', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('not json');
    expect(getPackageVersion()).toBe('unknown');
  });

  it('returns "unknown" when package.json cannot be read', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('EACCES');
    });
    expect(getPackageVersion()).toBe('unknown');
  });
});
