import type { Framework } from '../../config/types.js';
import { EXPOSED_SECRET_REASON, isExposedSecret } from './shared.js';

/**
 * Next.js environment variable rules.
 *
 * Only variables prefixed with `NEXT_PUBLIC_` are inlined into client code.
 */
export const nextjs: Framework = {
  name: 'nextjs',
  packageName: 'next',

  check(usage, { file, content }) {
    if (
      isClientFile(file, content) &&
      !usage.variable.startsWith('NEXT_PUBLIC_')
    ) {
      return 'Server-only variable accessed from client code';
    }

    if (usage.pattern === 'import.meta.env') {
      return 'Next.js uses process.env, not import.meta.env (Vite syntax)';
    }

    if (isExposedSecret(usage.variable, ['NEXT_PUBLIC_'])) {
      return EXPOSED_SECRET_REASON;
    }

    return undefined;
  },
};

/**
 * Checks whether a file runs in the browser:
 *  - App Router: files with a "use client" directive
 *  - Pages Router: everything in `pages/` except `pages/api/`
 */
function isClientFile(file: string, content?: string): boolean {
  return hasUseClientDirective(content) || isPagesRouterPage(file);
}

function hasUseClientDirective(content?: string): boolean {
  if (!content) return false;

  // The directive must appear at the top of the file
  const firstLines = content.split('\n').slice(0, 10).join('\n');
  return (
    /['"]use client['"]/.test(firstLines) || /^use client;?$/m.test(firstLines)
  );
}

function isPagesRouterPage(file: string): boolean {
  return /(^|\/)pages\//.test(file) && !/(^|\/)pages\/api\//.test(file);
}
