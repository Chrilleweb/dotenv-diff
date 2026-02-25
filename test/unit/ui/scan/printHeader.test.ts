import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printHeader } from '../../../../src/ui/scan/printHeader.js';

describe('printHeader (scan)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when comparedAgainst is undefined', () => {
    printHeader();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints header when comparedAgainst is provided', () => {
    printHeader('.env.example');

    expect(logSpy).toHaveBeenCalledTimes(2);

    // Leading blank line
    expect(logSpy).toHaveBeenNthCalledWith(1);

    // Header message
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.cyan(
        '📋 Scanning environment variable usage against: .env.example',
      ),
    );
  });
});
