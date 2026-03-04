import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printPrompt } from '../../../../src/ui/compare/printPrompt.js';
import { accent, warning, dim, label, value, header } from '../../../../src/ui/theme.js';

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

    expect(logSpy).toHaveBeenCalledWith(`${warning('▸')} ${header('No env files found')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Status'.padEnd(26))}${warning('no .env* or .env.example found')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Action'.padEnd(26))}${dim('skipping comparison')}`);
  });

  it('prints missingEnv message with basename', () => {
    printPrompt.missingEnv('/some/path/.env.production');

    expect(logSpy).toHaveBeenCalledWith(`${warning('▸')} ${header('File not found')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('File'.padEnd(26))}${warning('.env.production')}`);
  });

  it('prints skipCreation message', () => {
    printPrompt.skipCreation('.env');

    expect(logSpy).toHaveBeenCalledWith(`${dim('▸')} ${header('Skipping .env creation')}`);
  });

  it('prints envCreated message with basenames', () => {
    printPrompt.envCreated('/path/to/.env', '/another/path/.env.example');

    expect(logSpy).toHaveBeenCalledWith(`${accent('▸')} ${header('File created')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Created'.padEnd(26))}${value('.env')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('From'.padEnd(26))}${dim('.env.example')}`);
  });

  it('prints exampleCreated message with basenames', () => {
    printPrompt.exampleCreated('/path/.env.example', '/path/.env');

    expect(logSpy).toHaveBeenCalledWith(`${accent('▸')} ${header('File created')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('Created'.padEnd(26))}${value('.env.example')}`);
    expect(logSpy).toHaveBeenCalledWith(`${label('From'.padEnd(26))}${dim('.env')}`);
  });
});
