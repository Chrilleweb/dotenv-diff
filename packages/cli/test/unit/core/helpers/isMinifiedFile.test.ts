import { describe, it, expect } from 'vitest';
import { isMinifiedFile } from '../../../../src/core/helpers/isMinifiedFile.js';

/** A realistic source line of about 40 characters */
const SOURCE_LINE = 'const value = process.env.API_KEY ?? "";';

describe('isMinifiedFile', () => {
  describe('file name', () => {
    it.each([
      'dist/app.min.js',
      'vendor/lib.min.mjs',
      'public/styles.min.css',
      'static/app.bundle.js',
      'APP.MIN.JS',
    ])('returns true for %s regardless of content', (filePath) => {
      expect(isMinifiedFile(filePath, 'const x = 1;')).toBe(true);
    });

    it.each(['src/min.ts', 'src/admin.ts', 'src/bundle.ts', 'src/min.js.ts'])(
      'does not treat %s as minified by name',
      (filePath) => {
        expect(isMinifiedFile(filePath, 'const x = 1;')).toBe(false);
      },
    );
  });

  describe('content', () => {
    it('returns false for an empty file', () => {
      expect(isMinifiedFile('src/app.ts', '')).toBe(false);
    });

    it('scans a normal file with a single very long line', () => {
      const content = [
        SOURCE_LINE,
        `const icon = "data:image/png;base64,${'A'.repeat(20_000)}";`,
        SOURCE_LINE,
      ].join('\n');

      expect(isMinifiedFile('src/icon.ts', content)).toBe(false);
    });

    it('scans a large file with mostly short lines and one huge line', () => {
      const content = [
        ...Array.from({ length: 2_000 }, () => SOURCE_LINE),
        'x'.repeat(100_000),
      ].join('\n');

      expect(isMinifiedFile('src/big.ts', content)).toBe(false);
    });

    it('returns true for a large single-line bundle', () => {
      const content = 'var a=1;'.repeat(10_000);

      expect(isMinifiedFile('src/vendor.js', content)).toBe(true);
    });

    it('returns true for a large bundle with a few short lines', () => {
      const content = [
        '/*! license */',
        'var a=1;'.repeat(10_000),
        '//# sourceMappingURL=vendor.js.map',
      ].join('\n');

      expect(isMinifiedFile('src/vendor.js', content)).toBe(true);
    });

    it('returns false for a small file with only long lines', () => {
      expect(isMinifiedFile('src/small.js', 'var a=1;'.repeat(1_000))).toBe(
        false,
      );
    });

    it('counts CRLF line endings as line breaks', () => {
      const content = Array.from({ length: 2_000 }, () => SOURCE_LINE).join(
        '\r\n',
      );

      expect(isMinifiedFile('src/windows.ts', content)).toBe(false);
    });
  });
});
