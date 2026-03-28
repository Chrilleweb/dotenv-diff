import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/ui/theme.js', () => ({
  UI_LABEL_WIDTH: 26,
  padLabel: (text: string) => text.padEnd(26),
  label: (text: string) => `L(${text})`,
  value: (text: string) => `V(${text})`,
  warning: (text: string) => `W(${text})`,
  error: (text: string) => `E(${text})`,
  divider: '---',
  header: (text: string) => `H(${text})`,
}));

import { printGitignoreWarning } from '../../../../src/ui/shared/printGitignore.js';
import { GITIGNORE_ISSUES } from '../../../../src/config/constants.js';

describe('printGitignoreWarning', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints NO_GITIGNORE warning using default console.log', () => {
    printGitignoreWarning({
      envFile: '.env',
      reason: GITIGNORE_ISSUES.NO_GITIGNORE,
    });

    expect(logSpy).toHaveBeenCalledWith('W(▸) H(Gitignore warning)');
    expect(logSpy).toHaveBeenCalledWith(
      `${'L(Issue'.padEnd(28)})W(no .gitignore found)`,
    );
  });

  it('prints NOT_IGNORED warning when reason is different', () => {
    printGitignoreWarning({
      envFile: '.env',
      reason: GITIGNORE_ISSUES.NOT_IGNORED,
    });

    expect(logSpy).toHaveBeenCalledWith('W(▸) H(Gitignore warning)');
    expect(logSpy).toHaveBeenCalledWith(
      `${'L(Issue'.padEnd(28)})W(not ignored by git)`,
    );
  });

  it('uses strict formatting when strict mode is enabled', () => {
    printGitignoreWarning({
      envFile: '.env',
      reason: GITIGNORE_ISSUES.NOT_IGNORED,
      strict: true,
    });

    expect(logSpy).toHaveBeenCalledWith('E(▸) H(Gitignore warning)');
    expect(logSpy).toHaveBeenCalledWith(`${'L(File'.padEnd(28)})E(.env)`);
    expect(logSpy).toHaveBeenCalledWith(
      `${'L(Issue'.padEnd(28)})E(not ignored by git)`,
    );
  });

  it('uses custom log function when provided', () => {
    const customLog = vi.fn();

    printGitignoreWarning({
      envFile: '.env',
      reason: GITIGNORE_ISSUES.NOT_IGNORED,
      log: customLog,
    });

    expect(customLog).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
