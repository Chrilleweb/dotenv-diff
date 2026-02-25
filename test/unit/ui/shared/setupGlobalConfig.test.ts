import { describe, it, expect, afterEach } from 'vitest';
import chalk from 'chalk';
import { setupGlobalConfig } from '../../../../src/ui/shared/setupGlobalConfig.js';
import type { Options } from '../../../../src/config/types.js';

describe('setupGlobalConfig', () => {
  const originalLevel = chalk.level;

  afterEach(() => {
    // Restore original chalk level after each test
    chalk.level = originalLevel;
  });

  it('disables colors when noColor is true', () => {
    const opts = {
      noColor: true,
    } as Options;

    chalk.level = 1; // ensure starting with color enabled

    setupGlobalConfig(opts);

    expect(chalk.level).toBe(0);
  });

  it('does not modify chalk level when noColor is false', () => {
    const opts = {
      noColor: false,
    } as Options;

    chalk.level = 1;

    setupGlobalConfig(opts);

    expect(chalk.level).toBe(1);
  });
});
