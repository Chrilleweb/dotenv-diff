import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printCommentWarnings } from '../../../../src/ui/scan/printCommentWarnings.js';
import type { CommentWarning } from '../../../../src/config/types.js';

describe('printCommentWarnings', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('prints nothing when there are no warnings', () => {
    printCommentWarnings([]);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('prints the header and each undocumented key', () => {
    const warnings: CommentWarning[] = [
      { key: 'DB_HOST', line: 3 },
      { key: 'SECRET', line: 4 },
    ];

    printCommentWarnings(warnings);

    const out = consoleLogSpy.mock.calls.flat().join(' ');
    expect(out).toContain('Undocumented keys');
    expect(out).toContain('DB_HOST');
    expect(out).toContain('SECRET');
    expect(out).toContain('missing a documenting # comment');
  });

  it('still prints in strict mode (error styling branch)', () => {
    const warnings: CommentWarning[] = [{ key: 'API_KEY', line: 1 }];

    printCommentWarnings(warnings, true);

    const out = consoleLogSpy.mock.calls.flat().join(' ');
    expect(out).toContain('Undocumented keys');
    expect(out).toContain('API_KEY');
  });
});
