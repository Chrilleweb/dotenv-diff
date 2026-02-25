import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import {
  printInvalidCategory,
  printInvalidRegex,
  printCiYesWarning,
} from '../../../../src/ui/shared/printOptionErrors.js';

describe('printInvalidCategory', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints error and exits with code 1', () => {
    printInvalidCategory('--only', ['bad1', 'bad2'], ['allowed1', 'allowed2']);

    expect(errorSpy).toHaveBeenCalledWith(
      chalk.red(
        `❌ Error: invalid --only value(s): bad1, bad2.\n` +
          `   Allowed: allowed1, allowed2`,
      ),
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('printInvalidRegex', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints regex error and exits with code 1', () => {
    printInvalidRegex('[abc');

    expect(errorSpy).toHaveBeenCalledWith(
      chalk.red('❌ Error: invalid --ignore-regex pattern: [abc'),
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('printCiYesWarning', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints warning message', () => {
    printCiYesWarning();

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('⚠️  Both --ci and --yes provided; proceeding with --yes.'),
    );
  });
});
