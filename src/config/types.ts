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
  ignoreUrls?: string[];
  noCompare: boolean;
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
  ignoreUrls?: string[];
  noCompare?: boolean;
  init?: boolean;
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
  ignoreUrls?: string[];
  noCompare?: boolean;
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

/** Options for scanning the codebase for environment variable usage. */
export interface ScanUsageOptions extends ScanOptions {
  envPath?: string | undefined;
  examplePath?: string | undefined;
  fix?: boolean;
  json: boolean;
  showUnused: boolean;
  showStats: boolean;
  isCiMode?: boolean;
  files?: string[];
  allowDuplicates?: boolean;
  strict?: boolean;
}

export interface ScanJsonEntry {
  stats: {
    filesScanned: number;
    totalUsages: number;
    uniqueVariables: number;
  };
  missing: Array<{
    variable: string;
    usages: Array<{
      file: string;
      line: number;
      pattern: string;
      context: string;
    }>;
  }>;
  unused: string[];
  allUsages?: Array<{
    variable: string;
    file: string;
    line: number;
    pattern: string;
    context: string;
  }>;
  // Add comparison info
  comparedAgainst?: string;
  totalEnvVariables?: number;
  secrets?: Array<{
    file: string;
    line: number;
    message: string;
    snippet: string;
  }>;
  duplicates?: {
    env?: Array<{ key: string; count: number }>;
    example?: Array<{ key: string; count: number }>;
  };
}

// Type for grouped usages by variable
export interface VariableUsages {
  [variable: string]: EnvUsage[];
}

export interface ComparisonOptions {
  checkValues: boolean;
  cwd: string;
  allowDuplicates?: boolean;
  fix?: boolean;
  json?: boolean;
  ignore: string[];
  ignoreRegex: RegExp[];
  collect?: (entry: CompareJsonEntry) => void;
  only?: Category[];
  showStats?: boolean;
  strict?: boolean;
}

export interface FilePair {
  envName: string;
  envPath: string;
  examplePath: string;
}

export interface ComparisonResult {
  exitWithError: boolean;
}

export type PairContext = {
  envName: string;
  envPath: string;
  exampleName: string;
  examplePath: string;
  exists: { env: boolean; example: boolean };
  currentFull?: Record<string, string>;
  exampleFull?: Record<string, string>;
  currentKeys?: string[];
  exampleKeys?: string[];
  current?: Record<string, string>;
  example?: Record<string, string>;
};

export type Filtered = {
  missing: string[];
  extra?: string[];
  empty?: string[];
  mismatches?: Array<{ key: string; expected: string; actual: string }>;
  duplicatesEnv: Array<{ key: string; count: number }>;
  duplicatesEx: Array<{ key: string; count: number }>;
  gitignoreIssue: { reason: 'no-gitignore' | 'not-ignored' } | null;
};
