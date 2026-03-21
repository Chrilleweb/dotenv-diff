import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printErrorNotFound } from '../../../../src/ui/compare/printErrorNotFound.js';
import {
  UI_LABEL_WIDTH,
  error,
  label,
  value,
  header,
} from '../../../../src/ui/theme.js';

describe('printErrorNotFound', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints error when only env file is missing', () => {
    printErrorNotFound(false, true, '/path/.env', '/path/.env.example');

    expect(logSpy).toHaveBeenCalledWith(
      `${error('▸')} ${header('File not found')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Missing env'.padEnd(UI_LABEL_WIDTH))}${error('.env')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Suggestion'.padEnd(UI_LABEL_WIDTH))}${value('ensure both files exist before comparing')}`,
    );
  });

  it('prints error when only example file is missing', () => {
    printErrorNotFound(true, false, '/path/.env', '/path/.env.example');

    expect(logSpy).toHaveBeenCalledWith(
      `${error('▸')} ${header('File not found')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Missing example'.padEnd(UI_LABEL_WIDTH))}${error('.env.example')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Suggestion'.padEnd(UI_LABEL_WIDTH))}${value('ensure both files exist before comparing')}`,
    );
  });

  it('prints errors when both files are missing', () => {
    printErrorNotFound(false, false, '/path/.env', '/path/.env.example');

    expect(logSpy).toHaveBeenCalledWith(
      `${error('▸')} ${header('File not found')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Missing env'.padEnd(UI_LABEL_WIDTH))}${error('.env')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Missing example'.padEnd(UI_LABEL_WIDTH))}${error('.env.example')}`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${label('Suggestion'.padEnd(UI_LABEL_WIDTH))}${value('ensure both files exist before comparing')}`,
    );
  });

  it('prints nothing when both files exist', () => {
    printErrorNotFound(true, true, '/path/.env', '/path/.env.example');

    expect(logSpy).not.toHaveBeenCalled();
  });
});
