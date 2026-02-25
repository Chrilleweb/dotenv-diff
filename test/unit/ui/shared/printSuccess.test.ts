import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { printSuccess } from '../../../../src/ui/shared/printSuccess.js';

describe('printSuccess', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when json is true', () => {
    printSuccess(true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints compare success message', () => {
    printSuccess(false, 'compare');

    expect(logSpy).toHaveBeenCalledWith(chalk.green('✅ All keys match.'));

    expect(logSpy).toHaveBeenLastCalledWith();
  });

  it('prints scan success message when comparedAgainst provided', () => {
    printSuccess(false, 'scan', '.env.example');

    expect(logSpy).toHaveBeenCalledWith(
      chalk.green(
        '✅ All used environment variables are defined in .env.example',
      ),
    );

    expect(logSpy).toHaveBeenLastCalledWith();
  });

  it('prints unused success when showUnused is true and unused is empty', () => {
    printSuccess(false, 'scan', '.env.example', [], true);

    expect(logSpy).toHaveBeenCalledWith(
      chalk.green('✅ No unused environment variables found'),
    );
  });

  it('does not print unused message when unused is not empty', () => {
    printSuccess(false, 'scan', '.env.example', ['A'], true);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('No unused'),
      ),
    ).toBe(false);
  });

  it('does not print unused message when showUnused is false', () => {
    printSuccess(false, 'scan', '.env.example', [], false);

    expect(
      logSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('No unused'),
      ),
    ).toBe(false);
  });

  it('does nothing when mode is scan but comparedAgainst is missing', () => {
    printSuccess(false, 'scan');

    expect(logSpy).not.toHaveBeenCalled();
  });
});
