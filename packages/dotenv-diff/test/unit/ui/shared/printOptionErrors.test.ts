import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  printInvalidCategory,
  printInvalidRegex,
  printCiYesWarning,
} from '../../../../src/ui/shared/printOptionErrors.js';
import {
  error,
  warning,
  value,
  label,
  divider,
  header,
} from '../../../../src/ui/theme.js';

describe('printInvalidCategory', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints error and exits with code 1', () => {
    printInvalidCategory('--only', ['bad1', 'bad2'], ['allowed1', 'allowed2']);

    expect(logSpy).toHaveBeenCalledWith(
      `${error('▸')} ${header('Invalid flag')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Invalid values'.padEnd(26))}${error('bad1, bad2')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Allowed'.padEnd(26))}${value('allowed1, allowed2')}`,
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('printInvalidRegex', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints regex error and exits with code 1', () => {
    printInvalidRegex('[abc');

    expect(logSpy).toHaveBeenCalledWith(
      `${error('▸')} ${header('Invalid regex')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Pattern'.padEnd(26))}${error('[abc')}`,
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
      `${warning('▸')} ${header('Flag conflict')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Resolution'.padEnd(26))}${value('proceeding with --yes')}`,
    );
  });
});
