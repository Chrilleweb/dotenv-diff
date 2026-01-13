import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../../src/config/loadConfig.js';
import { makeTmpDir } from '../utils/fs-helpers.js';
import * as printStatus from '../../src/ui/shared/printConfigStatus.js';

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = makeTmpDir();
});

describe('loadConfig', () => {
  it('finds config in parent directory when running from subfolder', () => {
    const rootConfigPath = path.join(tmpRoot, 'dotenv-diff.config.json');
    const appDir = path.join(tmpRoot, 'apps', 'frontend');
    fs.mkdirSync(appDir, { recursive: true });

    // Write config in root
    fs.writeFileSync(
      rootConfigPath,
      JSON.stringify({ ignore: ['FOO'] }, null, 2),
    );

    // Change CWD to app dir temporarily
    const oldCwd = process.cwd();
    process.chdir(appDir);

    const config = loadConfig({});
    process.chdir(oldCwd);

    expect(config.ignore).toEqual(['FOO']);
  });

  it('uses local config if present in current directory', () => {
    const appDir = path.join(tmpRoot, 'apps', 'frontend');
    fs.mkdirSync(appDir, { recursive: true });

    // Local config should override parent one
    fs.writeFileSync(
      path.join(appDir, 'dotenv-diff.config.json'),
      JSON.stringify({ ignore: ['BAR'] }, null, 2),
    );

    const oldCwd = process.cwd();
    process.chdir(appDir);

    const config = loadConfig({});
    process.chdir(oldCwd);

    expect(config.ignore).toEqual(['BAR']);
  });

  it('returns empty config if no file found', () => {
    const noConfigDir = path.join(tmpRoot, 'no-config');
    fs.mkdirSync(noConfigDir, { recursive: true });

    const oldCwd = process.cwd();
    process.chdir(noConfigDir);

    const config = loadConfig({});
    process.chdir(oldCwd);

    expect(config).toEqual({});
  });

  it('prints config load error when config file contains invalid JSON and json flag is not set', () => {
    const appDir = path.join(tmpRoot, 'apps', 'frontend');
    fs.mkdirSync(appDir, { recursive: true });

    // Write invalid JSON config
    fs.writeFileSync(
      path.join(appDir, 'dotenv-diff.config.json'),
      '{ invalid json ',
    );

    const errorSpy = vi
      .spyOn(printStatus, 'printConfigLoadError')
      .mockImplementation(() => {});

    const oldCwd = process.cwd();
    process.chdir(appDir);

    loadConfig({}); // json flag NOT set

    process.chdir(oldCwd);

    expect(errorSpy).toHaveBeenCalledOnce();

    errorSpy.mockRestore();
  });

  it('does not print config load error when json flag is set and config is invalid', () => {
    const appDir = path.join(tmpRoot, 'apps', 'frontend');
    fs.mkdirSync(appDir, { recursive: true });

    // Write invalid JSON config
    fs.writeFileSync(
      path.join(appDir, 'dotenv-diff.config.json'),
      '{ invalid json ',
    );

    const errorSpy = vi
      .spyOn(printStatus, 'printConfigLoadError')
      .mockImplementation(() => {});

    const oldCwd = process.cwd();
    process.chdir(appDir);

    loadConfig({ json: true });

    process.chdir(oldCwd);

    expect(errorSpy).not.toHaveBeenCalled(); // this should not be called when json flag is set

    errorSpy.mockRestore();
  });

  it('prints config loaded message when valid config is found and json flag is not set', () => {
    const appDir = path.join(tmpRoot, 'apps', 'frontend');
    fs.mkdirSync(appDir, { recursive: true });

    const configPath = path.join(appDir, 'dotenv-diff.config.json');

    fs.writeFileSync(configPath, JSON.stringify({ ignore: ['FOO'] }, null, 2));

    const loadedSpy = vi
      .spyOn(printStatus, 'printConfigLoaded')
      .mockImplementation(() => {});

    const oldCwd = process.cwd();
    process.chdir(appDir);

    loadConfig({}); // json flag NOT set

    process.chdir(oldCwd);

    expect(loadedSpy).toHaveBeenCalledOnce();
    expect(loadedSpy).toHaveBeenCalledWith(fs.realpathSync(configPath));

    loadedSpy.mockRestore();
  });

  it('does not print config loaded message when json flag is set', () => {
    const appDir = path.join(tmpRoot, 'apps', 'frontend');
    fs.mkdirSync(appDir, { recursive: true });

    fs.writeFileSync(
      path.join(appDir, 'dotenv-diff.config.json'),
      JSON.stringify({ ignore: ['FOO'] }, null, 2),
    );

    const loadedSpy = vi
      .spyOn(printStatus, 'printConfigLoaded')
      .mockImplementation(() => {});

    const oldCwd = process.cwd();
    process.chdir(appDir);

    loadConfig({ json: true });

    process.chdir(oldCwd);

    expect(loadedSpy).not.toHaveBeenCalled();

    loadedSpy.mockRestore();
  });
});
