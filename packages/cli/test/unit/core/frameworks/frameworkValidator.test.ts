import { describe, it, expect, vi, afterEach } from 'vitest';
import type { EnvUsage, Framework } from '../../../../src/config/types.js';

vi.mock('../../../../src/core/frameworks/frameworkDetector.js', () => ({
  detectFramework: vi.fn(),
}));

import {
  frameworkValidator,
  validateUsages,
} from '../../../../src/core/frameworks/frameworkValidator.js';
import { detectFramework } from '../../../../src/core/frameworks/frameworkDetector.js';

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

/** Creates a fake framework whose check always returns the given reason */
function fakeFramework(reason?: string): Framework {
  return {
    name: 'nextjs',
    packageName: 'next',
    check: vi.fn(() => reason),
  };
}

describe('frameworkValidator', () => {
  it('applies the rules of the detected framework', () => {
    const framework = fakeFramework('Something is wrong');
    vi.mocked(detectFramework).mockReturnValue({ framework, version: '1.0.0' });

    const warnings = frameworkValidator([mockUsage], '/project');

    expect(framework.check).toHaveBeenCalledOnce();
    expect(warnings).toHaveLength(1);
  });

  it('returns empty warnings when no framework is detected', () => {
    vi.mocked(detectFramework).mockReturnValue(undefined);

    const warnings = frameworkValidator([mockUsage], '/project');

    expect(warnings).toEqual([]);
  });
});

describe('validateUsages', () => {
  it('builds a warning from the reason returned by the framework', () => {
    const warnings = validateUsages([mockUsage], fakeFramework('Bad usage'));

    expect(warnings).toEqual([
      {
        variable: 'API_KEY',
        reason: 'Bad usage',
        file: 'src/index.ts',
        line: 1,
        framework: 'nextjs',
      },
    ]);
  });

  it('returns no warnings when the framework returns no reason', () => {
    const warnings = validateUsages([mockUsage], fakeFramework(undefined));

    expect(warnings).toEqual([]);
  });

  it('passes the normalized file path and file content to the framework', () => {
    const framework = fakeFramework(undefined);
    const usage = { ...mockUsage, file: 'src\\app\\page.tsx' };
    const fileContentMap = new Map([[usage.file, '"use client"']]);

    validateUsages([usage], framework, fileContentMap);

    expect(framework.check).toHaveBeenCalledWith(usage, {
      file: 'src/app/page.tsx',
      content: '"use client"',
    });
  });

  it('skips files inside node_modules', () => {
    const framework = fakeFramework('Bad usage');
    const usage = { ...mockUsage, file: 'src/node_modules/pkg/index.js' };

    const warnings = validateUsages([usage], framework);

    expect(framework.check).not.toHaveBeenCalled();
    expect(warnings).toEqual([]);
  });
});
