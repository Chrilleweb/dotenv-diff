import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printHeader } from '../../../../src/ui/compare/printHeader.js';

describe('printHeader', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when json is true', () => {
    printHeader('.env', '.env.example', true);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints header when json is false', () => {
    printHeader('.env', '.env.example', false);

    expect(logSpy).toHaveBeenCalledTimes(3);

    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.blue('🔍 Comparing .env ↔ .env.example...'),
    );
    expect(logSpy).toHaveBeenNthCalledWith(3);
  });
});
