import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printUppercaseWarning } from '../../../../src/ui/scan/printUppercaseWarning.js';
import {
  accent,
  error,
  label,
  value,
  divider,
  header,
} from '../../../../src/ui/theme.js';
import type { UppercaseWarning } from '../../../../src/config/types.js';

describe('printUppercaseWarning', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when warnings array is empty', () => {
    printUppercaseWarning([], '.env');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints a single uppercase warning', () => {
    const warnings: UppercaseWarning[] = [
      { key: 'apiKey', suggestion: 'API_KEY' },
    ];

    printUppercaseWarning(warnings, '.env');

    expect(logSpy).toHaveBeenNthCalledWith(1);
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      `${accent('▸')} ${header('Uppercase warnings (.env)')}`,
    );
    expect(logSpy).toHaveBeenNthCalledWith(3, `${divider}`);
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      `${label('apiKey'.padEnd(26))}${value('API_KEY')}`,
    );
    expect(logSpy).toHaveBeenNthCalledWith(5, `${divider}`);
    expect(logSpy).toHaveBeenNthCalledWith(6);
  });

  it('prints with error accent in strict mode', () => {
    const warnings: UppercaseWarning[] = [
      { key: 'apiKey', suggestion: 'API_KEY' },
    ];

    printUppercaseWarning(warnings, '.env', true);

    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      `${error('▸')} ${header('Uppercase warnings (.env)')}`,
    );
  });

  it('prints multiple uppercase warnings', () => {
    const warnings: UppercaseWarning[] = [
      { key: 'apiKey', suggestion: 'API_KEY' },
      { key: 'secretKey', suggestion: 'SECRET_KEY' },
    ];

    printUppercaseWarning(warnings, '.env');

    expect(logSpy).toHaveBeenCalledWith(
      `${label('apiKey'.padEnd(26))}${value('API_KEY')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('secretKey'.padEnd(26))}${value('SECRET_KEY')}`,
    );
  });
});
