import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  printConfigLoaded,
  printConfigLoadError,
} from '../../../../src/ui/shared/printConfigStatus.js';

describe('printConfigStatus', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('printConfigLoaded', () => {
    it('prints success message with config file name', () => {
      printConfigLoaded('/path/to/dotenv-diff.config.json');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Config'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('dotenv-diff.config.json'));
    });
  });

  describe('printConfigLoadError', () => {
    it('prints error message when Error instance is thrown', () => {
      const err = new Error('Invalid JSON syntax');
      printConfigLoadError(err);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Config Error'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON syntax'));
    });

    it('prints error message when non-Error value is thrown', () => {
      printConfigLoadError('Something went wrong');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });

    it('handles null as error value', () => {
      printConfigLoadError(null);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('null'));
    });

    it('handles number as error value', () => {
      printConfigLoadError(404);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('404'));
    });
  });
});
