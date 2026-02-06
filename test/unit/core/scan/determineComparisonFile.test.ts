import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { determineComparisonFile } from '../../../../src/core/scan/determineComparisonFile.js';
import type { ScanUsageOptions } from '../../../../src/config/types.js';
import { normalizePath } from '../../../../src/core/helpers/normalizePath.js';
import fs from 'fs';
import path from 'path';

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

  it('returns examplePath when it exists', async () => {
    const expectedPath = normalizePath(path.resolve('/project/.env.example'));
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      examplePath: '.env.example',
    };

    const result = await determineComparisonFile(opts);

    expect(result).toEqual({
      type: 'found',
      file: {
        path: expectedPath,
        name: '.env.example',
      },
    });
    expect(mockExistsSync).toHaveBeenCalled();
  });

  it('returns envPath when it exists and no examplePath provided', async () => {
    const expectedPath = normalizePath(path.resolve('/project/.env.local'));
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      envPath: '.env.local',
    };

    const result = await determineComparisonFile(opts);

    expect(result).toEqual({
      type: 'found',
      file: {
        path: expectedPath,
        name: '.env.local',
      },
    });
    expect(mockExistsSync).toHaveBeenCalled();
  });

  it('prioritizes examplePath over envPath when both exist', async () => {
    const expectedPath = normalizePath(path.resolve('/project/.env.example'));
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      examplePath: '.env.example',
      envPath: '.env',
    };

    const result = await determineComparisonFile(opts);

    expect(result).toEqual({
      type: 'found',
      file: {
        path: expectedPath,
        name: '.env.example',
      },
    });
    expect(mockExistsSync).toHaveBeenCalled();
  });

  it('falls back to envPath when examplePath does not exist', async () => {
    const expectedPath = path.resolve('/project/.env');
    mockExistsSync.mockImplementation((p) => p === expectedPath);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      examplePath: '.env.example',
      envPath: '.env',
    };

    const result = await determineComparisonFile(opts);

    expect(result).toEqual({
      type: 'found',
      file: {
        path: normalizePath(expectedPath),
        name: '.env',
      },
    });
  });

  it('falls back to auto-discovery when envPath does not exist', async () => {
    const expectedPath = path.resolve('/project/.env');
    mockExistsSync.mockImplementation((p) => p === expectedPath);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      envPath: '.env.missing',
    };

    const result = await determineComparisonFile(opts);

    expect(result).toEqual({
      type: 'found',
      file: {
        path: normalizePath(expectedPath),
        name: '.env',
      },
    });
  });

  it('auto-discovers first available candidate when no paths provided', async () => {
    const expectedPath = path.resolve('/project/.env.local');
    mockExistsSync.mockImplementation((p) => p === expectedPath);

    const result = await determineComparisonFile(baseOpts);

    expect(result).toEqual({
      type: 'found',
      file: {
        path: normalizePath(expectedPath),
        name: '.env.local',
      },
    });
  });

  it('returns type none when no files exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await determineComparisonFile(baseOpts);

    expect(result).toEqual({ type: 'none' });
  });

  it('resolves relative paths correctly', async () => {
    const expectedPath = normalizePath(path.resolve('/home/user/project/config/.env.example'));
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      cwd: '/home/user/project',
      examplePath: 'config/.env.example',
    };

    const result = await determineComparisonFile(opts);

    expect(result).toEqual({
      type: 'found',
      file: {
        path: expectedPath,
        name: '.env.example',
      },
    });
  });

  it('handles absolute paths correctly', async () => {
    const absolutePath = '/absolute/path/.env.example';
    const expectedPath = normalizePath(absolutePath);
    mockExistsSync.mockReturnValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      examplePath: absolutePath,
    };

    const result = await determineComparisonFile(opts);

    expect(result).toEqual({
      type: 'found',
      file: {
        path: expectedPath,
        name: '.env.example',
      },
    });
    expect(mockExistsSync).toHaveBeenCalled();
  });
});
