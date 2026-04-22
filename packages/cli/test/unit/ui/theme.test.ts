import { describe, it, expect } from 'vitest';
import {
  dim,
  label,
  value,
  accent,
  warning,
  error,
  divider,
  header,
  wrapReason,
  padLabel,
  UI_LABEL_WIDTH,
} from '../../../src/ui/theme.js';

describe('theme exports', () => {
  it('exposes formatter functions and divider string', () => {
    expect(typeof dim).toBe('function');
    expect(typeof label).toBe('function');
    expect(typeof value).toBe('function');
    expect(typeof accent).toBe('function');
    expect(typeof warning).toBe('function');
    expect(typeof error).toBe('function');
    expect(typeof header).toBe('function');
    expect(typeof divider).toBe('string');
  });

  it('formatters return strings', () => {
    expect(typeof dim('x')).toBe('string');
    expect(typeof label('x')).toBe('string');
    expect(typeof value('x')).toBe('string');
    expect(typeof accent('x')).toBe('string');
    expect(typeof warning('x')).toBe('string');
    expect(typeof error('x')).toBe('string');
    expect(typeof header('x')).toBe('string');
  });
});

describe('wrapReason', () => {
  it('returns the original reason when at or below max length', () => {
    expect(wrapReason('Short reason', 4)).toBe('Short reason');
    expect(wrapReason('123456789012345678901234', 2)).toBe(
      '123456789012345678901234',
    );
  });

  it('wraps long reason text and indents wrapped lines', () => {
    const reason = 'This reason should wrap nicely across lines';

    const result = wrapReason(reason, 4);

    expect(result).toBe('This reason should wrap\n    nicely across lines');
  });

  it('wraps into multiple lines with consistent indentation', () => {
    const reason =
      'One two three four five six seven eight nine ten eleven twelve';

    const result = wrapReason(reason, 6);

    const lines = result.split('\n');

    expect(lines.length).toBeGreaterThan(2);
    expect(lines.slice(1).every((line) => line.startsWith(' '.repeat(6)))).toBe(
      true,
    );
  });

  it('does not append an empty trailing line when final chunk is only whitespace', () => {
    const reason = '123456789012345678901234 ';

    const result = wrapReason(reason, 4);

    expect(result).toBe('123456789012345678901234');
    expect(result.endsWith('\n')).toBe(false);
  });
});

describe('padLabel', () => {
  it('pads short labels to UI_LABEL_WIDTH (line 60)', () => {
    const result = padLabel('SHORT');
    expect(result).toBe('SHORT'.padEnd(UI_LABEL_WIDTH));
    expect(result.length).toBe(UI_LABEL_WIDTH);
  });

  it('adds MIN_LABEL_GAP spaces when label is at or exceeds UI_LABEL_WIDTH (line 59)', () => {
    const longLabel = 'A'.repeat(UI_LABEL_WIDTH); // exactly at threshold
    const result = padLabel(longLabel);
    expect(result).toBe(longLabel + '  ');
    expect(result.startsWith(longLabel)).toBe(true);
  });
});
