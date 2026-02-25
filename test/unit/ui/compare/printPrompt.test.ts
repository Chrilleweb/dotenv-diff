import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printPrompt } from '../../../../src/ui/compare/printPrompt.js';

describe('printPrompt', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints noEnvFound message', () => {
    printPrompt.noEnvFound();

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.yellow(
        '⚠️  No .env* or .env.example file found. Skipping comparison.',
      ),
    );
  });

  it('prints missingEnv message with basename', () => {
    printPrompt.missingEnv('/some/path/.env.production');

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.yellow('📄 .env.production file not found.'),
    );
  });

  it('prints skipCreation message', () => {
    printPrompt.skipCreation('.env');

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.gray('🚫 Skipping .env creation.'),
    );
  });

  it('prints envCreated message with basenames', () => {
    printPrompt.envCreated('/path/to/.env', '/another/path/.env.example');

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.green('✅ .env file created successfully from .env.example.'),
    );
  });

  it('prints exampleCreated message with basenames', () => {
    printPrompt.exampleCreated('/path/.env.example', '/path/.env');

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      chalk.green('✅ .env.example file created successfully from .env.'),
    );
  });
});
