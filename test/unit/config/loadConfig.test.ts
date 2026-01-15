import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig } from '../../../src/config/loadConfig.js';

// ---- mocks ----
vi.mock('../../../src/ui/shared/printConfigStatus.js', () => ({
  printConfigLoaded: vi.fn(),
  printConfigLoadError: vi.fn(),
}));

import {
  printConfigLoaded,
  printConfigLoadError,
} from '../../../src/ui/shared/printConfigStatus.js';

describe('loadConfig', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-config-'));
    process.chdir(cwd);
  });

  afterEach(() => {
    process.chdir('/');
    fs.rmSync(cwd, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('returns CLI options when no config file exists', () => {
    const result = loadConfig({ strict: true });

    expect(result).toEqual({ strict: true });
    expect(printConfigLoaded).not.toHaveBeenCalled();
  });

  it('loads config file from cwd and merges with CLI options', () => {
    fs.writeFileSync(
      path.join(cwd, 'dotenv-diff.config.json'),
      JSON.stringify({ strict: false, example: '.env.example' }),
    );

    const result = loadConfig({ strict: true });

    expect(result).toEqual({
      strict: true, // CLI overrides
      example: '.env.example',
    });

    expect(printConfigLoaded).toHaveBeenCalled();
  });

  it('finds config file in parent directory', () => {
    const parent = cwd;
    const child = path.join(parent, 'subdir');

    fs.mkdirSync(child);
    fs.writeFileSync(
      path.join(parent, 'dotenv-diff.config.json'),
      JSON.stringify({ ignore: ['FOO'] }),
    );

    process.chdir(child);

    const result = loadConfig({});

    expect(result.ignore).toEqual(['FOO']);
  });

  it('handles invalid JSON config gracefully', () => {
    fs.writeFileSync(
      path.join(cwd, 'dotenv-diff.config.json'),
      '{ invalid json',
    );

    const result = loadConfig({ strict: true });

    expect(result).toEqual({ strict: true });
    expect(printConfigLoadError).toHaveBeenCalled();
  });

  it('does not print config messages when json mode is enabled', () => {
    fs.writeFileSync(
      path.join(cwd, 'dotenv-diff.config.json'),
      JSON.stringify({ strict: false }),
    );

    loadConfig({ json: true });

    expect(printConfigLoaded).not.toHaveBeenCalled();
    expect(printConfigLoadError).not.toHaveBeenCalled();
  });
});
