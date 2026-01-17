import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  printConfigLoaded,
  printConfigLoadError,
} from '../../../../src/ui/shared/printConfigStatus.js';

describe('printConfigStatus', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('printConfigLoaded', () => {
    it('prints success message with config file name', () => {
      printConfigLoaded('/path/to/dotenv-diff.config.json');

      expect(consoleLogSpy).toHaveBeenCalledWith();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded config:'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('dotenv-diff.config.json'),
      );
    });
  });

  describe('printConfigLoadError', () => {
    it('prints error message when Error instance is thrown', () => {
      const error = new Error('Invalid JSON syntax');
      printConfigLoadError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse dotenv-diff.config.json'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON syntax'),
      );
    });

    it('prints error message when non-Error value is thrown', () => {
      const error = 'Something went wrong';
      printConfigLoadError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse dotenv-diff.config.json'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Something went wrong'),
      );
    });

    it('handles null as error value', () => {
      printConfigLoadError(null);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse dotenv-diff.config.json'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('null'),
      );
    });

    it('handles number as error value', () => {
      printConfigLoadError(404);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse dotenv-diff.config.json'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('404'),
      );
    });
  });
});
