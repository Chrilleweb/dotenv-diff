import { describe, it, expect, vi, afterEach } from 'vitest';
import { printMatrixTable } from '../../../../src/ui/matrix/printMatrixTable.js';
import type { MatrixResult } from '../../../../src/config/types.js';

describe('printMatrixTable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const result: MatrixResult = {
    files: ['.env.production', '.env.staging'],
    rows: [
      {
        key: 'A',
        presence: [true, true],
        values: ['1', '1'],
        hasMismatch: false,
      },
      {
        key: 'B',
        presence: [true, false],
        values: ['1', undefined],
        hasMismatch: false,
      },
    ],
    allMatch: false,
  };

  it('prints the summary line when showStats is true', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printMatrixTable(result, false, true);

    const printed = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(printed).toContain('2 files, 2 keys, 1 difference');
  });

  it('omits the summary line when showStats is false', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printMatrixTable(result, false, false);

    const printed = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(printed).not.toContain('difference');
  });

  it('marks mismatched values when checkValues is true', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mismatchResult: MatrixResult = {
      files: ['.env.production', '.env.staging'],
      rows: [
        {
          key: 'A',
          presence: [true, true],
          values: ['1', '2'],
          hasMismatch: true,
        },
      ],
      allMatch: false,
    };

    printMatrixTable(mismatchResult, true, true);

    const printed = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(printed).toContain('≠');
  });
});
