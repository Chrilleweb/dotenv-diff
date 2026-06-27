import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'path';
import { normalizeOptions } from '../../../src/config/options.js';

vi.mock('../../../src/ui/shared/printOptionErrors.js', () => ({
  printInvalidCategory: vi.fn(),
  printInvalidRegex: vi.fn(),
  printCiYesWarning: vi.fn(),
}));

import {
  printInvalidCategory,
  printInvalidRegex,
  printCiYesWarning,
} from '../../../src/ui/shared/printOptionErrors.js';

describe('normalizeOptions', () => {
  const cwd = process.cwd();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('parses boolean flags correctly', () => {
    const opts = normalizeOptions({
      ci: true,
      yes: true,
      fix: false,
    });

    expect(opts.isCiMode).toBe(true);
    expect(opts.isYesMode).toBe(true);
    expect(opts.fix).toBe(false);
  });

  it('applies default values for optional flags', () => {
    const opts = normalizeOptions({});

    expect(opts.showUnused).toBe(true);
    expect(opts.showStats).toBe(true);
    expect(opts.secrets).toBe(true);
    expect(opts.uppercaseKeys).toBe(true);
  });

  it('parses comma-separated lists', () => {
    const opts = normalizeOptions({
      ignore: 'FOO,BAR , BAZ',
      files: ['a.ts,b.ts'],
    });

    expect(opts.ignore).toEqual(['FOO', 'BAR', 'BAZ']);
    expect(opts.files).toEqual(['a.ts', 'b.ts']);
  });

  it('resolves env and example paths relative to cwd', () => {
    const opts = normalizeOptions({
      env: '.env.local',
      example: 'example.env',
    });

    expect(opts.envFlag).toBe(path.resolve(cwd, '.env.local'));
    expect(opts.exampleFlag).toBe(path.resolve(cwd, 'example.env'));
  });

  it('warns when both ci and yes are enabled', () => {
    normalizeOptions({ ci: true, yes: true });

    expect(printCiYesWarning).toHaveBeenCalled();
  });

  it('warns on invalid categories', () => {
    normalizeOptions({ only: 'missing,invalid' });

    expect(printInvalidCategory).toHaveBeenCalled();
  });

  it('warns on invalid regex patterns', () => {
    normalizeOptions({ ignoreRegex: '[invalid' });

    expect(printInvalidRegex).toHaveBeenCalled();
  });

  it('defaults scanUsage to true unless compare is set', () => {
    expect(normalizeOptions({}).scanUsage).toBe(true);
    expect(normalizeOptions({ compare: true }).scanUsage).toBe(false);
  });

  it('normalizes scanUsage string values to boolean', () => {
    expect(
      normalizeOptions({ scanUsage: 'true' as unknown as boolean }).scanUsage,
    ).toBe(true);
    expect(
      normalizeOptions({ scanUsage: 'false' as unknown as boolean }).scanUsage,
    ).toBe(false);
  });

  it('parses explain as trimmed string when provided', () => {
    expect(normalizeOptions({ explain: '  MY_KEY  ' }).explain).toBe('MY_KEY');
  });

  it('returns undefined for explain when not a string', () => {
    expect(normalizeOptions({}).explain).toBeUndefined();
    expect(
      normalizeOptions({ explain: true as unknown as string }).explain,
    ).toBeUndefined();
  });

  it('enables matrix mode with no files when --matrix is given without values', () => {
    const opts = normalizeOptions({ matrix: true });

    expect(opts.matrix).toBe(true);
    expect(opts.matrixFiles).toEqual([]);
  });

  it('enables matrix mode with explicit files when --matrix is given values', () => {
    const opts = normalizeOptions({
      matrix: ['.env.production', '.env.staging'],
    });

    expect(opts.matrix).toBe(true);
    expect(opts.matrixFiles).toEqual(['.env.production', '.env.staging']);
  });

  it('disables matrix mode when --matrix is not provided', () => {
    const opts = normalizeOptions({});

    expect(opts.matrix).toBe(false);
    expect(opts.matrixFiles).toEqual([]);
  });
});
