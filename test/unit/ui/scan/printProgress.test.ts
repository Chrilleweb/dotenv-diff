import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';

describe('printProgress', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when isJson is true', async () => {
    const { printProgress } =
      await import('../../../../src/ui/scan/printProgress.js');

    printProgress({ isJson: true, current: 1, total: 10 });

    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('returns early when total <= 0', async () => {
    const { printProgress } =
      await import('../../../../src/ui/scan/printProgress.js');

    printProgress({ isJson: false, current: 1, total: 0 });

    // Only initial newline because hasRendered was false
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it('renders progress bar with default label', async () => {
    const { printProgress } =
      await import('../../../../src/ui/scan/printProgress.js');

    printProgress({ isJson: false, current: 5, total: 10 });

    expect(
      writeSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('Scanning'),
      ),
    ).toBe(true);

    expect(
      writeSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes(' 50%'),
      ),
    ).toBe(true);
  });

  it('uses custom label', async () => {
    const { printProgress } =
      await import('../../../../src/ui/scan/printProgress.js');

    printProgress({
      isJson: false,
      current: 1,
      total: 2,
      label: 'Processing',
    });

    expect(
      writeSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('Processing'),
      ),
    ).toBe(true);
  });

  it('clamps current greater than total', async () => {
    const { printProgress } =
      await import('../../../../src/ui/scan/printProgress.js');

    printProgress({ isJson: false, current: 15, total: 10 });

    expect(
      writeSpy.mock.calls.some((call: [string]) =>
        String(call[0]).includes('(10/10 files)'),
      ),
    ).toBe(true);
  });

  it('resets hasRendered when complete', async () => {
    const { printProgress } =
      await import('../../../../src/ui/scan/printProgress.js');

    printProgress({ isJson: false, current: 10, total: 10 });

    // Should write completion newline
    expect(writeSpy.mock.calls.some((call: [string]) => call[0] === '\n')).toBe(
      true,
    );
  });

  it('does not print initial newline twice', async () => {
    const { printProgress } =
      await import('../../../../src/ui/scan/printProgress.js');

    printProgress({ isJson: false, current: 1, total: 10 });
    writeSpy.mockClear();

    printProgress({ isJson: false, current: 2, total: 10 });

    // No extra leading newline this time
    expect(writeSpy.mock.calls.some((call: [string]) => call[0] === '\n')).toBe(
      false,
    );
  });
});
