import { type SecretFinding } from '../core/secretDetectors.js';

// Allowed categories for comparison
export const ALLOWED_CATEGORIES = [
  'missing',
  'extra',
  'empty',
  'mismatch',
  'duplicate',
  'gitignore',
] as const;

// Type representing a single category for comparison
export type Category = (typeof ALLOWED_CATEGORIES)[number];

/** Type representing the options for the comparison
 * These are the options that are processed and validated before being used in the comparison.
 */
export type Options = {
  checkValues: boolean;
  isCiMode: boolean;
  isYesMode: boolean;
  allowDuplicates: boolean;
  fix: boolean;
  json: boolean;
  envFlag: string | undefined;
  exampleFlag: string | undefined;
  ignore: string[];
  ignoreRegex: RegExp[];
  cwd: string;
  only?: Category[];
  compare: boolean;
  scanUsage: boolean;
  includeFiles: string[];
  excludeFiles: string[];
  showUnused: boolean;
  showStats: boolean;
  files?: string[];
  noColor?: boolean;
  secrets: boolean;
  strict: boolean | undefined;
};

/** Type representing the raw options for the comparison
 * These are the options that are directly passed to the comparison function without any processing or validation.
 */
export type RawOptions = {
  checkValues?: boolean;
  ci?: boolean;
  yes?: boolean;
  allowDuplicates?: boolean;
  fix?: boolean;
  json?: boolean;
  env?: string;
  example?: string;
  ignore?: string | string[];
  ignoreRegex?: string | string[];
  only?: string | string[];
  compare?: boolean;
  noColor?: boolean;
  scanUsage?: boolean;
  includeFiles?: string | string[];
  excludeFiles?: string | string[];
  showUnused?: boolean;
  showStats?: boolean;
  files?: string | string[];
  secrets?: boolean;
  strict?: boolean;
};

/**
 * Type representing a single entry in the comparison results
 * This entry contains the environment variable and its example value.
 */
export type CompareJsonEntry = {
  env: string;
  example: string;
  skipped?: { reason: string };
  duplicates?: {
    env?: Array<{ key: string; count: number }>;
    example?: Array<{ key: string; count: number }>;
  };
  missing?: string[];
  extra?: string[];
  empty?: string[];
  valueMismatches?: Array<{ key: string; expected: string; actual: string }>;
  ok?: boolean;
};

/**
 * Represents a single usage of an environment variable in the codebase.
 */
export interface EnvUsage {
  variable: string;
  file: string;
  line: number;
  column: number;
  pattern:
    | 'process.env'
    | 'import.meta.env'
    | 'sveltekit'
    | 'deno'
    | 'next'
    | 'nuxt'
    | 'php';
  context: string; // The actual line content
}

export interface ScanOptions {
  cwd: string;
  include: string[];
  exclude: string[];
  ignore: string[];
  ignoreRegex: RegExp[];
  files?: string[];
  secrets?: boolean;
}

export interface ScanResult {
  used: EnvUsage[];
  missing: string[];
  unused: string[];
  stats: {
    filesScanned: number;
    totalUsages: number;
    uniqueVariables: number;
  };
  secrets: SecretFinding[];
  duplicates: {
    env?: Array<{ key: string; count: number }>;
    example?: Array<{ key: string; count: number }>;
  };
}