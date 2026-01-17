import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import fsSync from 'fs';
import { scanCodebase } from '../../../src/services/scanCodebase.js';
import type { ScanOptions } from '../../../src/config/types.js';

// Mock dependencies
vi.mock('../../../src/services/fileWalker.js', () => ({
  findFiles: vi.fn(),
}));

vi.mock('../../../src/core/scanFile.js', () => ({
  scanFile: vi.fn(),
}));

vi.mock('../../../src/core/security/secretDetectors.js', () => ({
  detectSecretsInSource: vi.fn(),
}));

vi.mock('../../../src/ui/scan/printProgress.js', () => ({
  printProgress: vi.fn(),
}));

import { findFiles } from '../../../src/services/fileWalker.js';
import { scanFile } from '../../../src/core/scanFile.js';
import { detectSecretsInSource } from '../../../src/core/security/secretDetectors.js';
import { printProgress } from '../../../src/ui/scan/printProgress.js';

describe('scanCodebase', () => {
  let tmpDir: string;
  let defaultOpts: ScanOptions;

  beforeEach(() => {
    tmpDir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'scan-test-'));

    defaultOpts = {
      cwd: tmpDir,
      include: [],
      exclude: [],
      ignore: [],
      ignoreRegex: [],
      files: [],
      secrets: false,
      ignoreUrls: [],
      json: false,
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    fsSync.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('basic scanning', () => {
    it('scans files and returns usages', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = process.env.API_KEY;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([
        {
          variable: 'API_KEY',
          file: testFile,
          line: 1,
          column: 10,
          pattern: 'process.env',
          context: 'const x = process.env.API_KEY;',
        },
      ]);

      const result = await scanCodebase(defaultOpts);

      expect(result.used).toHaveLength(1);
      expect(result.used[0].variable).toBe('API_KEY');
      expect(result.stats.filesScanned).toBe(1);
      expect(result.stats.totalUsages).toBe(1);
      expect(result.stats.uniqueVariables).toBe(1);
    });

    it('handles empty file list', async () => {
      vi.mocked(findFiles).mockResolvedValue([]);

      const result = await scanCodebase(defaultOpts);

      expect(result.used).toHaveLength(0);
      expect(result.stats.filesScanned).toBe(0);
      expect(result.stats.totalUsages).toBe(0);
      expect(result.stats.uniqueVariables).toBe(0);
    });

    it('handles files with no usages', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = 42;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([]);

      const result = await scanCodebase(defaultOpts);

      expect(result.used).toHaveLength(0);
      expect(result.stats.filesScanned).toBe(1);
    });
  });

  describe('file reading', () => {
    it('skips files that cannot be read', async () => {
      const testFile = path.join(tmpDir, 'unreadable.js');
      fsSync.writeFileSync(testFile, 'content');
      fsSync.chmodSync(testFile, 0o000); // Make file unreadable

      vi.mocked(findFiles).mockResolvedValue([testFile]);

      const result = await scanCodebase(defaultOpts);

      expect(result.stats.filesScanned).toBe(0);

      // Restore permissions for cleanup
      fsSync.chmodSync(testFile, 0o644);
    });

    it('continues scanning after encountering unreadable file', async () => {
      const unreadableFile = path.join(tmpDir, 'unreadable.js');
      const readableFile = path.join(tmpDir, 'readable.js');

      fsSync.writeFileSync(unreadableFile, 'content');
      fsSync.writeFileSync(readableFile, 'const x = process.env.KEY;');
      fsSync.chmodSync(unreadableFile, 0o000);

      vi.mocked(findFiles).mockResolvedValue([unreadableFile, readableFile]);
      vi.mocked(scanFile).mockReturnValue([
        {
          variable: 'KEY',
          file: readableFile,
          line: 1,
          column: 10,
          pattern: 'process.env',
          context: 'const x = process.env.KEY;',
        },
      ]);

      const result = await scanCodebase(defaultOpts);

      expect(result.stats.filesScanned).toBe(1);
      expect(result.used).toHaveLength(1);

      fsSync.chmodSync(unreadableFile, 0o644);
    });
  });

  describe('ignored variables', () => {
    it('filters out ignored variables', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = process.env.API_KEY;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([
        {
          variable: 'API_KEY',
          file: testFile,
          line: 1,
          column: 10,
          pattern: 'process.env',
          context: 'const x = process.env.API_KEY;',
        },
      ]);

      const result = await scanCodebase({
        ...defaultOpts,
        ignore: ['API_KEY'],
      });

      expect(result.used).toHaveLength(0);
    });

    it('filters out variables matching ignore regex', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = process.env.VITE_API_KEY;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([
        {
          variable: 'VITE_API_KEY',
          file: testFile,
          line: 1,
          column: 10,
          pattern: 'process.env',
          context: 'const x = process.env.VITE_API_KEY;',
        },
      ]);

      const result = await scanCodebase({
        ...defaultOpts,
        ignoreRegex: [/^VITE_/],
      });

      expect(result.used).toHaveLength(0);
    });

    it('keeps variables that do not match ignore patterns', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = process.env.API_KEY;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([
        {
          variable: 'API_KEY',
          file: testFile,
          line: 1,
          column: 10,
          pattern: 'process.env',
          context: 'const x = process.env.API_KEY;',
        },
      ]);

      const result = await scanCodebase({
        ...defaultOpts,
        ignore: ['OTHER_KEY'],
        ignoreRegex: [/^VITE_/],
      });

      expect(result.used).toHaveLength(1);
      expect(result.used[0].variable).toBe('API_KEY');
    });
  });

  describe('secret detection', () => {
    it('does not detect secrets when secrets option is false', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const key = "secret123";');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([]);

      const result = await scanCodebase({
        ...defaultOpts,
        secrets: false,
      });

      expect(detectSecretsInSource).not.toHaveBeenCalled();
      expect(result.secrets).toHaveLength(0);
    });

    it('filters out low severity secrets', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const key = "secret123";');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([]);
      vi.mocked(detectSecretsInSource).mockReturnValue([
        {
          file: 'app.js',
          line: 1,
          severity: 'low',
          message: 'Low severity secret',
          kind: 'pattern',
          snippet: 'const key = "secret123";',
        },
        {
          file: 'app.js',
          line: 2,
          severity: 'high',
          message: 'High severity secret',
          kind: 'pattern',
          snippet: 'const key = "secret456";',
        },
      ]);

      const result = await scanCodebase({
        ...defaultOpts,
        secrets: true,
      });

      expect(result.secrets).toHaveLength(1);
      expect(result.secrets[0].severity).toBe('high');
    });

    it('handles secret detection errors gracefully', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const key = "secret123";');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([]);
      vi.mocked(detectSecretsInSource).mockImplementation(() => {
        throw new Error('Detection failed');
      });

      const result = await scanCodebase({
        ...defaultOpts,
        secrets: true,
      });

      expect(result.secrets).toHaveLength(0);
    });
  });

  describe('progress printing', () => {
    it('prints progress for first file', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = 1;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([]);

      await scanCodebase(defaultOpts);

      expect(printProgress).toHaveBeenCalledWith({
        isJson: false,
        current: 1,
        total: 1,
      });
    });

    it('prints progress every 10 files', async () => {
      const files = Array.from({ length: 25 }, (_, i) => {
        const file = path.join(tmpDir, `file${i}.js`);
        fsSync.writeFileSync(file, 'const x = 1;');
        return file;
      });

      vi.mocked(findFiles).mockResolvedValue(files);
      vi.mocked(scanFile).mockReturnValue([]);

      await scanCodebase(defaultOpts);

      // Should print at: 1, 10, 20, 25
      expect(printProgress).toHaveBeenCalledTimes(4);
      expect(printProgress).toHaveBeenCalledWith({
        isJson: false,
        current: 1,
        total: 25,
      });
      expect(printProgress).toHaveBeenCalledWith({
        isJson: false,
        current: 10,
        total: 25,
      });
      expect(printProgress).toHaveBeenCalledWith({
        isJson: false,
        current: 20,
        total: 25,
      });
      expect(printProgress).toHaveBeenCalledWith({
        isJson: false,
        current: 25,
        total: 25,
      });
    });

    it('prints progress for last file', async () => {
      const files = Array.from({ length: 5 }, (_, i) => {
        const file = path.join(tmpDir, `file${i}.js`);
        fsSync.writeFileSync(file, 'const x = 1;');
        return file;
      });

      vi.mocked(findFiles).mockResolvedValue(files);
      vi.mocked(scanFile).mockReturnValue([]);

      await scanCodebase(defaultOpts);

      expect(printProgress).toHaveBeenCalledWith({
        isJson: false,
        current: 5,
        total: 5,
      });
    });
  });

  describe('logged variables', () => {
    it('tracks logged variables', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'console.log(process.env.API_KEY);');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([
        {
          variable: 'API_KEY',
          file: testFile,
          line: 1,
          column: 10,
          pattern: 'process.env',
          context: 'console.log(process.env.API_KEY);',
          isLogged: true,
        },
      ]);

      const result = await scanCodebase(defaultOpts);

      expect(result.logged).toHaveLength(1);
      expect(result.logged[0].variable).toBe('API_KEY');
      expect(result.logged[0].isLogged).toBe(true);
    });

    it('does not track non-logged variables', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = process.env.API_KEY;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([
        {
          variable: 'API_KEY',
          file: testFile,
          line: 1,
          column: 10,
          pattern: 'process.env',
          context: 'const x = process.env.API_KEY;',
          isLogged: false,
        },
      ]);

      const result = await scanCodebase(defaultOpts);

      expect(result.logged).toHaveLength(0);
    });
  });

  describe('file content map', () => {
    it('stores file content in map', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      const content = 'const x = process.env.API_KEY;';
      fsSync.writeFileSync(testFile, content);

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([]);

      const result = await scanCodebase(defaultOpts);

      expect(result.fileContentMap).toBeDefined();
      expect(result.fileContentMap!.size).toBe(1);
      expect(result.fileContentMap!.get('app.js')).toBe(content);
    });

    it('normalizes file paths in content map', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fsSync.mkdirSync(srcDir);
      const testFile = path.join(srcDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = 1;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([]);

      const result = await scanCodebase(defaultOpts);

      // Should use forward slashes even on Windows
      const keys = Array.from(result.fileContentMap!.keys());
      expect(keys[0]).toBe('src/app.js');
    });
  });

  describe('statistics', () => {
    it('counts unique variables correctly', async () => {
      const testFile = path.join(tmpDir, 'app.js');
      fsSync.writeFileSync(testFile, 'const x = process.env.API_KEY;');

      vi.mocked(findFiles).mockResolvedValue([testFile]);
      vi.mocked(scanFile).mockReturnValue([
        {
          variable: 'API_KEY',
          file: testFile,
          line: 1,
          column: 10,
          pattern: 'process.env',
          context: 'const x = process.env.API_KEY;',
        },
        {
          variable: 'API_KEY',
          file: testFile,
          line: 2,
          column: 10,
          pattern: 'process.env',
          context: 'const y = process.env.API_KEY;',
        },
        {
          variable: 'DB_URL',
          file: testFile,
          line: 3,
          column: 10,
          pattern: 'process.env',
          context: 'const z = process.env.DB_URL;',
        },
      ]);

      const result = await scanCodebase(defaultOpts);

      expect(result.stats.totalUsages).toBe(3);
      expect(result.stats.uniqueVariables).toBe(2);
    });
  });

  describe('files option', () => {
    it('passes files option to findFiles when provided', async () => {
      vi.mocked(findFiles).mockResolvedValue([]);

      await scanCodebase({
        ...defaultOpts,
        files: ['src/**/*.js'],
      });

      expect(findFiles).toHaveBeenCalledWith(
        tmpDir,
        expect.objectContaining({
          files: ['src/**/*.js'],
        }),
      );
    });
    it('does not pass files option when undefined', async () => {
      vi.mocked(findFiles).mockResolvedValue([]);

      await scanCodebase({
        ...defaultOpts,
        files: undefined,
      });

      expect(findFiles).toHaveBeenCalledWith(
        tmpDir,
        expect.not.objectContaining({
          files: expect.anything(),
        }),
      );
    });
  });

  describe('integration scenarios', () => {
    it('handles multiple files with mixed usages', async () => {
      const file1 = path.join(tmpDir, 'app.js');
      const file2 = path.join(tmpDir, 'config.js');

      fsSync.writeFileSync(file1, 'const x = process.env.API_KEY;');
      fsSync.writeFileSync(file2, 'const y = process.env.DB_URL;');

      vi.mocked(findFiles).mockResolvedValue([file1, file2]);
      vi.mocked(scanFile)
        .mockReturnValueOnce([
          {
            variable: 'API_KEY',
            file: file1,
            line: 1,
            column: 10,
            pattern: 'process.env',
            context: 'const x = process.env.API_KEY;',
          },
        ])
        .mockReturnValueOnce([
          {
            variable: 'DB_URL',
            file: file2,
            line: 1,
            column: 10,
            pattern: 'process.env',
            context: 'const y = process.env.DB_URL;',
          },
        ]);

      const result = await scanCodebase(defaultOpts);

      expect(result.used).toHaveLength(2);
      expect(result.stats.filesScanned).toBe(2);
      expect(result.stats.uniqueVariables).toBe(2);
    });
  });
});
