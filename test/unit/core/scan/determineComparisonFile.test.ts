import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { determineComparisonFile } from '../../../../src/core/scan/determineComparisonFile.js';
import type { ScanUsageOptions } from '../../../../src/config/types.js';
import fs from 'fs';

vi.mock('fs');

describe('determineComparisonFile', () => {
  const mockExistsSync = vi.mocked(fs.existsSync);

  const baseOpts: ScanUsageOptions = {
    cwd: '/project',
    include: [],
    exclude: [],
    ignore: [],
    ignoreRegex: [],
    secrets: false,
    json: false,
  };

  beforeEach(() => {
    mockExistsSync.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns examplePath when it exists', () => {
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      examplePath: '.env.example',
    };

    const result = determineComparisonFile(opts);

    expect(result).toEqual({
      path: '/project/.env.example',
      name: '.env.example',
    });
    expect(mockExistsSync).toHaveBeenCalledWith('/project/.env.example');
  });

  it('returns envPath when it exists and no examplePath provided', () => {
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      envPath: '.env.local',
    };

    const result = determineComparisonFile(opts);

    expect(result).toEqual({
      path: '/project/.env.local',
      name: '.env.local',
    });
    expect(mockExistsSync).toHaveBeenCalledWith('/project/.env.local');
  });

  it('prioritizes examplePath over envPath when both exist', () => {
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      examplePath: '.env.example',
      envPath: '.env',
    };

    const result = determineComparisonFile(opts);

    expect(result).toEqual({
      path: '/project/.env.example',
      name: '.env.example',
    });
    expect(mockExistsSync).toHaveBeenCalledWith('/project/.env.example');
    expect(mockExistsSync).not.toHaveBeenCalledWith('/project/.env');
  });

  it('falls back to envPath when examplePath does not exist', () => {
    mockExistsSync.mockImplementation((p) => p === '/project/.env');

    const opts: ScanUsageOptions = {
      ...baseOpts,
      examplePath: '.env.example',
      envPath: '.env',
    };

    const result = determineComparisonFile(opts);

    expect(result).toEqual({
      path: '/project/.env',
      name: '.env',
    });
  });

  it('falls back to auto-discovery when envPath does not exist', () => {
    mockExistsSync.mockImplementation((p) => p === '/project/.env');

    const opts: ScanUsageOptions = {
      ...baseOpts,
      envPath: '.env.missing',
    };

    const result = determineComparisonFile(opts);

    expect(result).toEqual({
      path: '/project/.env',
      name: '.env',
    });
  });

  it('auto-discovers first available candidate when no paths provided', () => {
    mockExistsSync.mockImplementation((p) => p === '/project/.env.local');

    const result = determineComparisonFile(baseOpts);

    expect(result).toEqual({
      path: '/project/.env.local',
      name: '.env.local',
    });
  });

  it('returns undefined when no files exist', () => {
    mockExistsSync.mockReturnValue(false);

    const result = determineComparisonFile(baseOpts);

    expect(result).toBeUndefined();
  });

  it('resolves relative paths correctly', () => {
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      cwd: '/home/user/project',
      examplePath: 'config/.env.example',
    };

    const result = determineComparisonFile(opts);

    expect(result).toEqual({
      path: '/home/user/project/config/.env.example',
      name: '.env.example',
    });
  });

  it('handles absolute paths correctly', () => {
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      examplePath: '/absolute/path/.env.example',
    };

    const result = determineComparisonFile(opts);

    expect(result).toEqual({
      path: '/absolute/path/.env.example',
      name: '.env.example',
    });
    expect(mockExistsSync).toHaveBeenCalledWith('/absolute/path/.env.example');
  });
});
