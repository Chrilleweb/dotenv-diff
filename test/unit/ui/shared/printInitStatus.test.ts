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
    printInitSuccess('/path/to/dotenv-diff.config.json');

    expect(logSpy).toHaveBeenCalledTimes(4);

    // First blank line
    expect(logSpy).toHaveBeenNthCalledWith(1);

    // Success message
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.green('✅ Created dotenv-diff.config.json'),
    );

    // Path line
    expect(logSpy).toHaveBeenNthCalledWith(
      3,
      chalk.dim('   → /path/to/dotenv-diff.config.json'),
    );

    // Trailing blank line
    expect(logSpy).toHaveBeenNthCalledWith(4);
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
    printInitExists('/path/to/dotenv-diff.config.json');

    expect(logSpy).toHaveBeenCalledTimes(4);

    // First blank line
    expect(logSpy).toHaveBeenNthCalledWith(1);

    // Warning message
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.yellow('⚠️  dotenv-diff.config.json already exists.'),
    );

    // Path line
    expect(logSpy).toHaveBeenNthCalledWith(
      3,
      chalk.dim('   → /path/to/dotenv-diff.config.json'),
    );

    // Trailing blank line
    expect(logSpy).toHaveBeenNthCalledWith(4);
  });
});
