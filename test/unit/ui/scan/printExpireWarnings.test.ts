import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printExpireWarnings } from '../../../../src/ui/scan/printExpireWarnings.js';
import type { ExpireWarning } from '../../../../src/config/types.js';

describe('printExpireWarnings', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should not print anything when warnings array is empty', () => {
    printExpireWarnings([]);

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should print header when warnings exist', () => {
    const warnings: ExpireWarning[] = [
      { key: 'API_KEY', date: '2026-01-28', daysLeft: 1 },
    ];

    printExpireWarnings(warnings);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Expiration warnings'),
    );
  });

  it('should show "expires tomorrow" for 1 day left', () => {
    const warnings: ExpireWarning[] = [
      { key: 'API_KEY', date: '2026-01-28', daysLeft: 1 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('expires tomorrow');
  });

  it('should use plural "days" for multiple days left', () => {
    const warnings: ExpireWarning[] = [
      { key: 'API_KEY', date: '2026-01-30', daysLeft: 3 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('expires in 3 days');
  });

  it('should show "EXPIRED YESTERDAY" when expired 1 day ago', () => {
    const warnings: ExpireWarning[] = [
      { key: 'OLD_KEY', date: '2026-01-26', daysLeft: -1 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('EXPIRED YESTERDAY');
  });

  it('should use plural "days" when expired multiple days ago', () => {
    const warnings: ExpireWarning[] = [
      { key: 'OLD_KEY', date: '2026-01-20', daysLeft: -7 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('EXPIRED 7 days ago');
  });

  it('should show "EXPIRES TODAY" for 0 days left', () => {
    const warnings: ExpireWarning[] = [
      { key: 'URGENT_KEY', date: '2026-01-27', daysLeft: 0 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('EXPIRES TODAY');
  });

  it('should handle multiple warnings', () => {
    const warnings: ExpireWarning[] = [
      { key: 'KEY1', date: '2026-01-28', daysLeft: 1 },
      { key: 'KEY2', date: '2026-01-30', daysLeft: 3 },
      { key: 'KEY3', date: '2026-01-20', daysLeft: -7 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('expires tomorrow');
    expect(calls).toContain('expires in 3 days');
    expect(calls).toContain('EXPIRED 7 days ago');
  });

  it('should display the key and date in output', () => {
    const warnings: ExpireWarning[] = [
      { key: 'MY_API_KEY', date: '2026-02-15', daysLeft: 19 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('MY_API_KEY');
    expect(calls).toContain('2026-02-15');
  });

  it('should use yellow color for 4-7 days left', () => {
    const warnings: ExpireWarning[] = [
      { key: 'API_KEY', date: '2026-02-01', daysLeft: 5 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('expires in 5 days');
  });

  it('should use green color for more than 7 days left', () => {
    const warnings: ExpireWarning[] = [
      { key: 'API_KEY', date: '2026-02-10', daysLeft: 14 },
    ];

    printExpireWarnings(warnings);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('expires in 14 days');
  });
});
