import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import {
  printInitSuccess,
  printInitExists,
} from '../../../../src/ui/shared/printInitStatus.js';

describe('printInitSuccess', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints success message with path', () => {
    printInitSuccess('dotenv-diff.config.json');

    expect(logSpy).toHaveBeenCalledTimes(5);

    // First blank line
    expect(logSpy).toHaveBeenNthCalledWith(1);

    // Success message
    expect(logSpy).toHaveBeenNthCalledWith(2, '▸ Config created');

    // Path line
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      'Path                      dotenv-diff.config.json',
    );
  });
});

describe('printInitExists', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints already exists warning with path', () => {
    printInitExists('dotenv-diff.config.json');

    expect(logSpy).toHaveBeenCalledTimes(5);

    // First blank line
    expect(logSpy).toHaveBeenNthCalledWith(1);

    // Warning message
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.yellow('▸ Config already exists'),
    );

    // Path line
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      chalk.dim('Path                      dotenv-diff.config.json'),
    );
  });
});
