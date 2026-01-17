import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import { detectFramework } from '../../../../src/core/frameworks/frameworkDetector.js';

vi.mock('fs');

describe('detectFramework', () => {
  it('detects sveltekit', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        dependencies: { '@sveltejs/kit': '2.0.0' },
      }),
    );

    const result = detectFramework('/project');

    expect(result.framework).toBe('sveltekit');
    expect(result.version).toBe('2.0.0');
  });

  it('returns unknown if no package.json', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const result = detectFramework('/project');

    expect(result.framework).toBe('unknown');
  });

  it('detects nextjs', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        dependencies: { next: '12.0.0' },
      }),
    );

    const result = detectFramework('/project');

    expect(result.framework).toBe('nextjs');
    expect(result.version).toBe('12.0.0');
  });

  it('returns unknown for unrecognized frameworks', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        dependencies: { react: '17.0.0' },
      }),
    );

    const result = detectFramework('/project');

    expect(result.framework).toBe('unknown');
  });

  it('returns unknown when package.json contains invalid JSON', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{ invalid json }');

    const result = detectFramework('/project');

    expect(result).toEqual({ framework: 'unknown' });
  });
});
