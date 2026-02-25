import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printErrorNotFound } from '../../../../src/ui/compare/printErrorNotFound.js';

describe('printErrorNotFound', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints error when only env file is missing', () => {
    printErrorNotFound(false, true, '/path/.env', '/path/.env.example');

    expect(consoleSpy).toHaveBeenCalledTimes(2);

    expect(consoleSpy).toHaveBeenNthCalledWith(
      1,
      chalk.red('❌ Error: --env file not found: .env'),
    );

    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      chalk.red(
        'Please ensure both files exist before running the comparison.',
      ),
    );
  });

  it('prints error when only example file is missing', () => {
    printErrorNotFound(true, false, '/path/.env', '/path/.env.example');

    expect(consoleSpy).toHaveBeenCalledTimes(2);

    expect(consoleSpy).toHaveBeenNthCalledWith(
      1,
      chalk.red('❌ Error: --example file not found: .env.example'),
    );

    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      chalk.red(
        'Please ensure both files exist before running the comparison.',
      ),
    );
  });

  it('prints errors when both files are missing', () => {
    printErrorNotFound(false, false, '/path/.env', '/path/.env.example');

    expect(consoleSpy).toHaveBeenCalledTimes(3);

    expect(consoleSpy).toHaveBeenNthCalledWith(
      1,
      chalk.red('❌ Error: --env file not found: .env'),
    );

    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      chalk.red('❌ Error: --example file not found: .env.example'),
    );

    expect(consoleSpy).toHaveBeenNthCalledWith(
      3,
      chalk.red(
        'Please ensure both files exist before running the comparison.',
      ),
    );
  });

  it('prints nothing when both files exist', () => {
    printErrorNotFound(true, true, '/path/.env', '/path/.env.example');

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
