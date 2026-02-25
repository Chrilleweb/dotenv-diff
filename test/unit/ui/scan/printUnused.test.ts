import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printUnused } from '../../../../src/ui/scan/printUnused.js';

describe('printUnused', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when unused array is empty', () => {
    printUnused([], '.env');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints unused variables with provided file name', () => {
    printUnused(['API_KEY', 'SECRET'], '.env');

    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      chalk.yellow('⚠️  Unused in codebase (defined in .env):'),
    );

    expect(logSpy).toHaveBeenNthCalledWith(2, chalk.yellow('   - API_KEY'));

    expect(logSpy).toHaveBeenNthCalledWith(3, chalk.yellow('   - SECRET'));

    expect(logSpy).toHaveBeenNthCalledWith(4);
  });

  it('falls back to "environment file" when comparedAgainst is empty', () => {
    printUnused(['A'], '');

    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellow('⚠️  Unused in codebase (defined in environment file):'),
    );
  });
});
