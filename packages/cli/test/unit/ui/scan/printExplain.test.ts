import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printExplain } from '../../../../src/ui/scan/printExplain.js';
import type { ExplainResult } from '../../../../src/ui/scan/printExplain.js';
import type { EnvUsage } from '../../../../src/config/types.js';

vi.mock('../../../../src/core/helpers/normalizePath.js', () => ({
  normalizePath: (p: string) => p,
}));

// Keep theme colors transparent so assertions work on raw text
vi.mock('../../../../src/ui/theme.js', () => ({
  accent: (s: string) => s,
  dim: (s: string) => s,
  error: (s: string) => s,
  header: (s: string) => s,
  label: (s: string) => s,
  divider: '---',
  padLabel: (s: string) => s,
  value: (s: string) => s,
  warning: (s: string) => s,
}));

function makeUsage(
  variable: string,
  file = 'src/app.ts',
  context = '',
): EnvUsage {
  return {
    variable,
    file,
    line: 5,
    column: 10,
    pattern: 'process.env',
    context,
  };
}

function baseResult(overrides: Partial<ExplainResult> = {}): ExplainResult {
  return {
    key: 'API_KEY',
    definedIn: [],
    usages: [],
    isDuplicated: false,
    isIgnored: false,
    ...overrides,
  };
}

describe('printExplain', () => {
  let _logSpy: ReturnType<typeof vi.spyOn>;
  let allOutput: string[];

  beforeEach(() => {
    allOutput = [];
    _logSpy = vi
      .spyOn(console, 'log')
      .mockImplementation((...args: unknown[]) => {
        allOutput.push(args.map(String).join(' '));
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── getSummary branches ──────────────────────────────────────────────────

  it('shows "missing from env files" when definedIn is empty', () => {
    printExplain(baseResult());

    const output = allOutput.join('\n');
    expect(output).toContain('missing from env files');
  });

  it('shows "needs attention" when key is defined but not used', () => {
    printExplain(baseResult({ definedIn: ['.env'] }));

    const output = allOutput.join('\n');
    expect(output).toContain('needs attention');
  });

  it('shows "needs attention" when key is duplicated', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY')],
        isDuplicated: true,
      }),
    );

    const output = allOutput.join('\n');
    expect(output).toContain('needs attention');
  });

  it('shows "needs attention" when key is ignored', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY')],
        isIgnored: true,
      }),
    );

    const output = allOutput.join('\n');
    expect(output).toContain('needs attention');
  });

  it('shows "ok" when key is defined, used, not duplicated, not ignored', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY')],
      }),
    );

    const output = allOutput.join('\n');
    expect(output).toContain('ok');
    expect(output).not.toContain('needs attention');
    expect(output).not.toContain('missing from env files');
  });

  // ── printFileList branches ───────────────────────────────────────────────

  it('prints "(not found in any env file)" when definedIn is empty', () => {
    printExplain(baseResult());

    expect(allOutput.join('\n')).toContain('(not found in any env file)');
  });

  it('prints single file on the label row', () => {
    printExplain(baseResult({ definedIn: ['.env'] }));

    const output = allOutput.join('\n');
    expect(output).toContain('Defined in');
    expect(output).toContain('.env');
  });

  it('prints multiple files with continuation rows', () => {
    printExplain(
      baseResult({ definedIn: ['.env', '.env.local', '.env.example'] }),
    );

    // The first file is on the label row, the rest are continuation rows;
    // all three paths must appear in the combined output
    const output = allOutput.join('\n');
    expect(output).toContain('.env');
    expect(output).toContain('.env.local');
    expect(output).toContain('.env.example');
  });

  // ── printUsageList branches ──────────────────────────────────────────────

  it('prints "(not found in codebase)" when there are no usages', () => {
    printExplain(baseResult({ definedIn: ['.env'] }));

    expect(allOutput.join('\n')).toContain('(not found in codebase)');
  });

  it('reports "1 location" for a single usage', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY')],
      }),
    );

    expect(allOutput.join('\n')).toContain('1 location');
  });

  it('reports "2 locations" for multiple usages', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY'), makeUsage('API_KEY', 'src/b.ts')],
      }),
    );

    expect(allOutput.join('\n')).toContain('2 locations');
  });

  it('prints usage with context when context is non-empty', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY', 'src/app.ts', 'process.env.API_KEY')],
      }),
    );

    const output = allOutput.join('\n');
    expect(output).toContain('src/app.ts:5');
    expect(output).toContain('process.env.API_KEY');
    expect(output).toContain('[process.env]');
  });

  it('prints usage without context when context is empty', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY', 'src/other.ts', '')],
      }),
    );

    const output = allOutput.join('\n');
    expect(output).toContain('src/other.ts:5');
    expect(output).toContain('[process.env]');
  });

  // ── printChecks / formatCheck branches ──────────────────────────────────

  it('shows ✓ for all checks when key is fully healthy', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY')],
        isDuplicated: false,
        isIgnored: false,
      }),
    );

    const checks = allOutput.filter((l) => l.includes('✓') || l.includes('✘'));
    expect(checks.every((l) => l.includes('✓'))).toBe(true);
  });

  it('shows ✘ Defined when key is not defined', () => {
    printExplain(baseResult({ definedIn: [] }));

    const checksOutput = allOutput.join('\n');
    expect(checksOutput).toContain('✘');
    expect(checksOutput).toContain('Defined');
  });

  it('shows ✘ Used when key is not used', () => {
    printExplain(baseResult({ definedIn: ['.env'] }));

    const checksOutput = allOutput.join('\n');
    // "Used" check should fail
    expect(checksOutput).toContain('✘');
  });

  it('shows ✘ Not duplicated when isDuplicated is true', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY')],
        isDuplicated: true,
      }),
    );

    expect(allOutput.join('\n')).toContain('⚠ Key is duplicated');
    expect(allOutput.join('\n')).not.toContain('Not duplicated');
  });

  it('shows ⚠ warning when isIgnored is true', () => {
    printExplain(
      baseResult({
        definedIn: ['.env'],
        usages: [makeUsage('API_KEY')],
        isIgnored: true,
      }),
    );

    expect(allOutput.join('\n')).toContain('⚠ Key is ignored');
    expect(allOutput.join('\n')).not.toContain('Not ignored');
  });
  // ── structural output ────────────────────────────────────────────────────

  it('prints the key name in the header', () => {
    printExplain(baseResult({ key: 'MY_SECRET' }));

    expect(allOutput.join('\n')).toContain('MY_SECRET');
  });

  it('prints divider at start and end', () => {
    printExplain(baseResult());

    const dividerLines = allOutput.filter((l) => l === '---');
    expect(dividerLines.length).toBeGreaterThanOrEqual(2);
  });
});
