import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runInit } from '../../../src/commands/init.js';

// ---- mocks ----
vi.mock('../../../src/ui/shared/printInitStatus.js', () => ({
  printInitSuccess: vi.fn(),
  printInitExists: vi.fn(),
}));

import {
  printInitSuccess,
  printInitExists,
} from '../../../src/ui/shared/printInitStatus.js';

describe('runInit', () => {
  let cwd: string;
  const configFile = 'dotenv-diff.config.json';

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-init-'));
    process.chdir(cwd);
  });

  afterEach(() => {
    process.chdir('/');
    fs.rmSync(cwd, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('does nothing and warns if config file already exists', async () => {
    fs.writeFileSync(path.join(cwd, configFile), '{}');

    await runInit();

    expect(printInitExists).toHaveBeenCalledWith(path.resolve(configFile));
    expect(printInitSuccess).not.toHaveBeenCalled();
  });

  it('creates default config file when missing', async () => {
    await runInit();

    const configPath = path.join(cwd, configFile);
    expect(fs.existsSync(configPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(content).toMatchObject({
      strict: false,
      example: '.env.example',
      ignore: ['NODE_ENV', 'VITE_MODE'],
      ignoreUrls: ['https://example.com'],
    });

    expect(printInitSuccess).toHaveBeenCalledWith(path.resolve(configFile));
  });

  it('handles failure to create dotenv-diff.config.json', async () => {
    const writeSpy = vi
      .spyOn(fs.promises, 'writeFile')
      .mockRejectedValueOnce(new Error('disk full'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runInit()).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalled();

    writeSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
