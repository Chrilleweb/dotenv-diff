import { describe, it, expect, vi, afterEach } from 'vitest';
import type { EnvUsage } from '../../../../src/config/types.js';

vi.mock('../../../../src/core/frameworks/frameworkDetector.js', () => ({
  detectFramework: vi.fn(),
}));

vi.mock('../../../../src/core/frameworks/index.js', () => ({
  applySvelteKitRules: vi.fn(),
  applyNextJsRules: vi.fn(),
}));

import { frameworkValidator } from '../../../../src/core/frameworks/frameworkValidator.js';
import { detectFramework } from '../../../../src/core/frameworks/frameworkDetector.js';
import {
  applySvelteKitRules,
  applyNextJsRules,
} from '../../../../src/core/frameworks/index.js';

afterEach(() => {
  vi.clearAllMocks();
});

const mockUsage: EnvUsage = {
  variable: 'API_KEY',
  file: 'src/index.ts',
  line: 1,
  column: 0,
  pattern: 'process.env',
  context: '',
};

describe('frameworkValidator', () => {
  it('applies SvelteKit rules when framework is sveltekit', () => {
    (detectFramework as any).mockReturnValue({ framework: 'sveltekit' });

    const warnings = frameworkValidator([mockUsage], '/project');

    expect(applySvelteKitRules).toHaveBeenCalledOnce();
    expect(applySvelteKitRules).toHaveBeenCalledWith(
      mockUsage,
      expect.any(Array),
    );
    expect(applyNextJsRules).not.toHaveBeenCalled();
    expect(warnings).toEqual([]);
  });

  it('applies Next.js rules when framework is nextjs', () => {
    (detectFramework as any).mockReturnValue({ framework: 'nextjs' });

    const fileContentMap = new Map<string, string>([
      ['src/index.ts', 'use client'],
    ]);

    const warnings = frameworkValidator(
      [mockUsage],
      '/project',
      fileContentMap,
    );

    expect(applyNextJsRules).toHaveBeenCalledOnce();
    expect(applyNextJsRules).toHaveBeenCalledWith(
      mockUsage,
      expect.any(Array),
      fileContentMap,
    );
    expect(applySvelteKitRules).not.toHaveBeenCalled();
    expect(warnings).toEqual([]);
  });

  it('returns empty warnings when framework is unknown', () => {
    (detectFramework as any).mockReturnValue({ framework: 'unknown' });

    const warnings = frameworkValidator([mockUsage], '/project');

    expect(applySvelteKitRules).not.toHaveBeenCalled();
    expect(applyNextJsRules).not.toHaveBeenCalled();
    expect(warnings).toEqual([]);
  });
});
