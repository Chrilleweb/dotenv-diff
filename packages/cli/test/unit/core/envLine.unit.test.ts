import { describe, it, expect } from 'vitest';
import {
  stripBom,
  splitEnvLines,
  parseEnvLine,
} from '../../../src/core/envLine.js';

const BOM = '\uFEFF';

describe('stripBom', () => {
  it('removes a leading UTF-8 BOM', () => {
    expect(stripBom(`${BOM}FOO=bar`)).toBe('FOO=bar');
  });

  it('returns content unchanged when there is no BOM', () => {
    expect(stripBom('FOO=bar')).toBe('FOO=bar');
  });

  it('only strips a BOM at the very start, not one in the middle', () => {
    expect(stripBom(`FOO=${BOM}bar`)).toBe(`FOO=${BOM}bar`);
  });

  it('handles an empty string', () => {
    expect(stripBom('')).toBe('');
  });

  it('strips a lone BOM to an empty string', () => {
    expect(stripBom(BOM)).toBe('');
  });
});

describe('splitEnvLines', () => {
  it('splits on LF line endings', () => {
    expect(splitEnvLines('A=1\nB=2\nC=3')).toEqual(['A=1', 'B=2', 'C=3']);
  });

  it('splits on CRLF line endings', () => {
    expect(splitEnvLines('A=1\r\nB=2\r\nC=3')).toEqual(['A=1', 'B=2', 'C=3']);
  });

  it('handles mixed LF and CRLF line endings', () => {
    expect(splitEnvLines('A=1\r\nB=2\nC=3')).toEqual(['A=1', 'B=2', 'C=3']);
  });

  it('strips a leading BOM before splitting', () => {
    expect(splitEnvLines(`${BOM}A=1\nB=2`)).toEqual(['A=1', 'B=2']);
  });

  it('returns a single-element array for content without newlines', () => {
    expect(splitEnvLines('A=1')).toEqual(['A=1']);
  });

  it('returns a single empty string for empty content', () => {
    expect(splitEnvLines('')).toEqual(['']);
  });

  it('preserves empty lines between entries', () => {
    expect(splitEnvLines('A=1\n\nB=2')).toEqual(['A=1', '', 'B=2']);
  });
});

describe('parseEnvLine', () => {
  it('parses a simple key/value pair', () => {
    expect(parseEnvLine('FOO=bar')).toEqual({ key: 'FOO', value: 'bar' });
  });

  it('trims whitespace around key and value', () => {
    expect(parseEnvLine('  FOO  =  bar  ')).toEqual({
      key: 'FOO',
      value: 'bar',
    });
  });

  it('splits only on the first "="', () => {
    expect(parseEnvLine('URL=postgres://u:p@host:5432/db')).toEqual({
      key: 'URL',
      value: 'postgres://u:p@host:5432/db',
    });
  });

  it('returns an empty value for a trailing "="', () => {
    expect(parseEnvLine('FOO=')).toEqual({ key: 'FOO', value: '' });
  });

  it('returns null for an empty line', () => {
    expect(parseEnvLine('')).toBeNull();
  });

  it('returns null for a whitespace-only line', () => {
    expect(parseEnvLine('   ')).toBeNull();
  });

  it('returns null for a comment line', () => {
    expect(parseEnvLine('# FOO=bar')).toBeNull();
  });

  it('returns null for an indented comment line', () => {
    expect(parseEnvLine('   # comment')).toBeNull();
  });

  it('returns null for a line without "="', () => {
    expect(parseEnvLine('INVALID')).toBeNull();
  });

  it('returns null when the key is empty', () => {
    expect(parseEnvLine('=value')).toBeNull();
  });

  it('returns null for a bare "="', () => {
    // trimmed line is "=", so indexOf('=') is 0 and the empty key is rejected
    expect(parseEnvLine('=')).toBeNull();
  });
});
