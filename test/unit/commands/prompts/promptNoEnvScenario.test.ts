import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptNoEnvScenario } from '../../../../src/commands/prompts/promptNoEnvScenario.js';
import type { ScanUsageOptions } from '../../../../src/config/types.js';
import * as prompts from '../../../../src/ui/prompts.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('../../../../src/ui/prompts.js');

describe('promptNoEnvScenario', () => {
  const mockWriteFileSync = vi.mocked(fs.writeFileSync);
  const mockConfirmYesNo = vi.mocked(prompts.confirmYesNo);
  const mockConsoleLog = vi.spyOn(console, 'log');

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
    mockWriteFileSync.mockClear();
    mockConfirmYesNo.mockClear();
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined compareFile when in CI mode', async () => {
    const opts: ScanUsageOptions = {
      ...baseOpts,
      isCiMode: true,
    };

    const result = await promptNoEnvScenario(opts);

    expect(result).toEqual({ compareFile: undefined });
    expect(mockConfirmYesNo).not.toHaveBeenCalled();
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('creates .env file automatically when in yes mode', async () => {
    const opts: ScanUsageOptions = {
      ...baseOpts,
      isYesMode: true,
    };

    const result = await promptNoEnvScenario(opts);

    const expectedPath = path.resolve('/project', '.env');

    expect(result).toEqual({
      compareFile: {
        path: expectedPath,
        name: '.env',
      },
    });
    expect(mockConfirmYesNo).not.toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalledWith(expectedPath, '');
  });

  it('prompts user and creates .env file when user confirms', async () => {
    mockConfirmYesNo.mockResolvedValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      isCiMode: false,
      isYesMode: false,
    };

    const result = await promptNoEnvScenario(opts);

    const expectedPath = path.resolve('/project', '.env');

    expect(mockConfirmYesNo).toHaveBeenCalledWith(
      "You don't have any .env files. Do you want to create a .env?",
      { isCiMode: false, isYesMode: false },
    );
    expect(result).toEqual({
      compareFile: {
        path: expectedPath,
        name: '.env',
      },
    });
    expect(mockWriteFileSync).toHaveBeenCalledWith(expectedPath, '');
  });

  it('returns undefined compareFile when user declines', async () => {
    mockConfirmYesNo.mockResolvedValue(false);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      isCiMode: false,
      isYesMode: false,
    };

    const result = await promptNoEnvScenario(opts);

    expect(mockConfirmYesNo).toHaveBeenCalledWith(
      "You don't have any .env files. Do you want to create a .env?",
      { isCiMode: false, isYesMode: false },
    );
    expect(result).toEqual({ compareFile: undefined });
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('handles different cwd paths correctly', async () => {
    const opts: ScanUsageOptions = {
      ...baseOpts,
      cwd: '/custom/project/path',
      isYesMode: true,
    };

    const result = await promptNoEnvScenario(opts);

    const expectedPath = path.resolve('/custom/project/path', '.env');

    expect(result).toEqual({
      compareFile: {
        path: expectedPath,
        name: '.env',
      },
    });
    expect(mockWriteFileSync).toHaveBeenCalledWith(expectedPath, '');
  });

  it('defaults isCiMode and isYesMode to false when undefined in prompt call', async () => {
    mockConfirmYesNo.mockResolvedValue(true);

    const opts: ScanUsageOptions = {
      ...baseOpts,
      isCiMode: undefined,
      isYesMode: undefined,
    };

    await promptNoEnvScenario(opts);

    expect(mockConfirmYesNo).toHaveBeenCalledWith(
      "You don't have any .env files. Do you want to create a .env?",
      { isCiMode: false, isYesMode: false },
    );
  });
});
