import { type SecretFinding } from '../core/secretDetectors.js';
import { type ExampleSecretWarning } from '../core/exampleSecretDetector.js';

// Type representing detected framework
export type Framework = 'sveltekit' | 'nextjs' | 'unknown';

// Type representing a framework-specific warning
export interface frameworkWarning {
  variable: string;
  reason: string;
  file: string;
  line: number;
  framework: Framework;
}

// Type representing a duplicate entry
export type Duplicate = { key: string; count: number };

// Type representing the result of duplicate detection
export interface DuplicateResult {
  dupsEnv: Duplicate[];
  dupsEx: Duplicate[];
}

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
  only: Category[];
  compare: boolean;
  scanUsage: boolean;
  includeFiles: string[];
  excludeFiles: string[];
  showUnused: boolean;
  showStats: boolean;
  files: string[];
  noColor: boolean;
  secrets: boolean;
  strict: boolean;
  ignoreUrls: string[];
  uppercaseKeys: boolean;
  expireWarnings: boolean;
  inconsistentNamingWarnings: boolean;
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
  init?: boolean;
  uppercaseKeys?: boolean;
  expireWarnings?: boolean;
  inconsistentNamingWarnings?: boolean;
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
    | 'sveltekit';
  context: string; // The actual line content
  isLogged?: boolean; // Whether this usage is logged to console
}

export interface ScanResult {
  used: EnvUsage[];
  missing: string[];
  unused: string[];
  stats: {
    filesScanned: number;
    totalUsages: number;
    uniqueVariables: number;
    warningsCount: number;
    duration: number;
  };
  secrets: SecretFinding[];
  duplicates: {
    env?: Array<{ key: string; count: number }>;
    example?: Array<{ key: string; count: number }>;
  };
  frameworkWarnings?: frameworkWarning[];
  exampleWarnings?: ExampleSecretWarning[];
  logged: EnvUsage[];
  uppercaseWarnings?: UppercaseWarning[];
  expireWarnings?: ExpireWarning[];
  inconsistentNamingWarnings?: InconsistentNamingWarning[];
  fileContentMap?: Map<string, string>;
}

export interface ScanOptions {
  cwd: string;
  include: string[];
  exclude: string[];
  ignore: string[];
  ignoreRegex: RegExp[];
  files: string[];
  secrets: boolean;
  ignoreUrls: string[];
}

/** Options for scanning the codebase for environment variable usage. */
export interface ScanUsageOptions extends ScanOptions {
  envPath?: string | undefined;
  examplePath?: string | undefined;
  fix?: boolean;
  json?: boolean;
  showUnused?: boolean;
  showStats?: boolean;
  isCiMode?: boolean;
  allowDuplicates?: boolean;
  strict?: boolean;
  uppercaseKeys?: boolean;
  expireWarnings?: boolean;
  inconsistentNamingWarnings?: boolean;
}

export interface ScanJsonEntry {
  stats?: {
    filesScanned: number;
    totalUsages: number;
    uniqueVariables: number;
    warningsCount: number;
    duration: number;
  };
  missing?: Array<{
    variable: string;
    usages: Array<{
      file: string;
      line: number;
      pattern: string;
      context: string;
    }>;
  }>;
  unused?: string[];
  allUsages?: Array<{
    variable: string;
    file: string;
    line: number;
    pattern: string;
    context: string;
  }>;
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
  logged?: Array<{
    variable: string;
    file: string;
    line: number;
    context: string;
  }>;
  expireWarnings?: Array<{
    key: string;
    date: string;
    daysLeft: number;
  }>;
  uppercaseWarnings?: Array<{
    key: string;
    suggestion: string;
  }>;
  inconsistentNamingWarnings?: Array<{
    key1: string;
    key2: string;
    suggestion: string;
  }>;
  frameworkWarnings?: Array<{
    variable: string;
    reason: string;
    file: string;
    line: number;
    framework: string;
  }>;
  exampleWarnings?: Array<{
    key: string;
    value: string;
    reason: string;
    severity: string;
  }>;
  healthScore?: number;
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
  uppercaseKeys?: boolean;
  expireWarnings?: boolean;
  inconsistentNamingWarnings?: boolean;
}

export interface FilePair {
  envName: string;
  envPath: string;
  examplePath: string;
}

export interface ExitResult {
  exitWithError: boolean;
}

export type Filtered = {
  missing: string[];
  extra?: string[];
  empty?: string[];
  mismatches?: Array<{ key: string; expected: string; actual: string }>;
  duplicatesEnv: Array<{ key: string; count: number }>;
  duplicatesEx: Array<{ key: string; count: number }>;
  gitignoreIssue: { reason: 'no-gitignore' | 'not-ignored' } | null;
};

export interface UppercaseWarning {
  key: string;
  suggestion: string;
}

export interface ExpireWarning {
  key: string;
  date: string;
  daysLeft: number;
}

export interface InconsistentNamingWarning {
  key1: string;
  key2: string;
  suggestion: string;
}

/**
 * Represents the discovery of environment files in a project.
 * Contains information about the current working directory, found environment files,
 * and the primary environment and example files.
 */
export interface Discovery {
  cwd: string;
  envFiles: string[];
  primaryEnv: string;
  primaryExample: string;
  envFlag: string | null;
  exampleFlag: string | null;
  alreadyWarnedMissingEnv: boolean;
}
