import type { Framework } from '../../config/types.js';
import { sveltekit } from './sveltekit.js';
import { nextjs } from './nextjs.js';
import { nuxt } from './nuxt.js';

/**
 * All supported frameworks.
 *
 * Order matters: detection picks the first framework whose package is installed.
 * Specific frameworks must therefore come before generic ones (e.g. a plain
 * Vite fallback), since many frameworks depend on Vite themselves.
 */
export const FRAMEWORKS: readonly Framework[] = [sveltekit, nextjs, nuxt];
