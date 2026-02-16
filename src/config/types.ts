import { ALLOWED_CATEGORIES, GITIGNORE_ISSUES } from './constants.js';
import { type SecretFinding } from '../core/security/secretDetectors.js';

/**
 * Supported frameworks
 */
export type SupportedFramework = 'sveltekit' | 'nextjs';

/**
 * Result of framework detection (may be unsupported)
 */
export type DetectedFramework = SupportedFramework | 'unknown';

/**
 * Framework-specific warning about environment variable usage
 * From rules defined for each supported framework (SvelteKit, Next.js)
 */
export interface FrameworkWarning {
  variable: string;
  reason: string;
  file: string;
  line: number;
  framework: SupportedFramework;
}

/**
 * Type representing a duplicate entry
 */
export type Duplicate = { key: string; count: number };

/**
 * Type representing the result of duplicate detection
 */
export interface DuplicateResult {
  dupsEnv: Duplicate[];
  dupsEx: Duplicate[];
}

/**
 * Type representing a single category for comparison
 */
export type Category = (typeof ALLOWED_CATEGORIES)[number];

/**
 * Raw options as received directly from the CLI argument parser.
 *
 * These values are intentionally loose and reflect how flags are actually
 * provided by the user:
 *  - Values may be missing
 *  - Lists may be strings or string arrays
 *  - No defaults are applied
 *  - No validation or normalization has happened yet
 *
 * This type should only be used at the CLI boundary and passed into the
 * normalization step that produces {@link Options}.
 */
export interface RawOptions {
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
}

/**
 * Normalized and validated options used internally by the application.
 *
 * These options represent the final, safe configuration that the rest of the
 * codebase can rely on. All values are:
 *  - Fully normalized (no string | string[] unions)
 *  - Resolved to absolute paths where applicable
 *  - Filled with defaults for omitted flags
 *  - Validated and ready for use
 *
 * This type should be used everywhere outside of CLI parsing and option
 * normalization logic.
 */
export interface Options {
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
}

/**
 * Represents a single usage of an environment variable in the codebase.
 */
export interface EnvUsage {
  variable: string;
  file: string;
  line: number;
  column: number;
  pattern: 'process.env' | 'import.meta.env' | 'sveltekit';
  imports?: string[]; // For sveltekit: list of imported env modules
  context: string; // The actual line content
  isLogged?: boolean; // Whether this usage is logged to console
}

/**
 * Type for grouped usages by variable
 */
export type VariableUsages = Record<string, EnvUsage[]>;

/**
 * Warning about secrets found in example files
 */
export interface ExampleSecretWarning {
  key: string;
  value: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * Statistics for codebase scanning
 */
export interface ScanStats {
  /** Total number of files scanned during the scan process */
  filesScanned: number;
  /** Total number of environment variable references found across all scanned files */
  totalUsages: number;
  /** Total number of unique environment variables referenced across all scanned files */
  uniqueVariables: number;
  /** Total number of warnings found during the scan process */
  warningsCount: number;
  /** Total duration of the scan process in seconds */
  duration: number;
}

/**
 * Options for scanning the codebase
 */
export interface ScanOptions {
  cwd: string;
  include: string[];
  exclude: string[];
  ignore: string[];
  ignoreRegex: RegExp[];
  files?: string[];
  secrets: boolean;
  ignoreUrls?: string[];
  json: boolean;
}

/**
 * Extends the basic ScanOptions with additional parameters.
 * All of these options are optional, as they may not be needed for every scan.
 */
export interface ScanUsageOptions extends ScanOptions {
  envPath?: string | undefined;
  examplePath?: string | undefined;
  fix?: boolean;
  showUnused?: boolean;
  showStats?: boolean;
  isCiMode?: boolean;
  isYesMode?: boolean;
  allowDuplicates?: boolean;
  strict?: boolean;
  uppercaseKeys?: boolean;
  expireWarnings?: boolean;
  inconsistentNamingWarnings?: boolean;
}

/**
 * Result of scanning the codebase for environment variable usages.
 */
export interface ScanResult {
  used: EnvUsage[];
  missing: string[];
  unused: string[];
  stats: ScanStats;
  secrets: SecretFinding[];
  duplicates: {
    env?: Duplicate[];
    example?: Duplicate[];
  };
  frameworkWarnings?: FrameworkWarning[];
  exampleWarnings?: ExampleSecretWarning[];
  logged: EnvUsage[];
  uppercaseWarnings?: UppercaseWarning[];
  expireWarnings?: ExpireWarning[];
  inconsistentNamingWarnings?: InconsistentNamingWarning[];
  fileContentMap?: Map<string, string>;
}

/**
 * Possible issues detected with .gitignore regarding environment files.
 */
export type GitignoreIssue =
  (typeof GITIGNORE_ISSUES)[keyof typeof GITIGNORE_ISSUES];

/**
 * Type representing a single entry in the comparison results
 * This entry contains the environment variable and its example value.
 */
export type CompareJsonEntry = {
  env: string;
  example: string;
  stats?: {
    envCount: number;
    exampleCount: number;
    sharedCount: number;
  };
  duplicates?: {
    env?: Duplicate[];
    example?: Duplicate[];
  };
  missing?: string[];
  extra?: string[];
  empty?: string[];
  gitignoreIssue?: { reason: GitignoreIssue };
  valueMismatches?: Array<{ key: string; expected: string; actual: string }>;
  ok?: boolean;
};

/**
 * Options for comparing environment files (--compare flag).
 */
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

/**
 * Resolved comparison file with absolute path and display name.
 */
export interface ComparisonFile {
  path: string;
  name: string;
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

/**
 * Represents a resolved pair of environment files used for comparison.
 *
 * A FilePair describes one concrete comparison unit consisting of:
 *  - an environment file (e.g. `.env`, `.env.production`)
 *  - the example file it should be compared against
 */
export interface FilePair {
  /** The name of the environment file (e.g. ".env", ".env.production") */
  envName: string;

  /** Absolute path to the environment file */
  envPath: string;

  /** Absolute path to the example file this env file is compared against */
  examplePath: string;
}

/**
 * Result of filtering comparison results based on categories
 */
export type Filtered = {
  missing: string[];
  extra?: string[];
  empty?: string[];
  mismatches?: Array<{ key: string; expected: string; actual: string }>;
  duplicatesEnv: Duplicate[];
  duplicatesEx: Duplicate[];
  gitignoreIssue: { reason: GitignoreIssue } | null;
};

/**
 * Result of the exit code determination after scanning or comparing.
 */
export interface ExitResult {
  exitWithError: boolean;
}

/**
 * Result of applying fixes to environment files.
 */
export interface FixResult {
  /** List of removed duplicate keys */
  removedDuplicates: string[];
  /** List of added environment variables */
  addedEnv: string[];
  /** Whether the .gitignore file was updated */
  gitignoreUpdated: boolean;
}

/**
 * Context for auto-fix operations, extending FixResult with applied status
 */
export interface FixContext extends FixResult {
  /** Whether any fixes were applied */
  fixApplied: boolean;
}

/**
 * Warning about environment variable keys that are not uppercase.
 */
export interface UppercaseWarning {
  key: string;
  suggestion: string;
}

/**
 * Warning about environment variable keys that have expiration dates.
 * fx:
 *
 * # @expire 2025-12-31
 * API_KEY=
 *
 * This will generate a warning that API_KEY expires on 2025-12-31.
 */
export interface ExpireWarning {
  key: string;
  date: string;
  daysLeft: number;
}

/**
 * Warning about inconsistent naming of environment variable keys.
 * fx: If you have both SECRET_KEY and SECRETKEY (inconsistent naming)
 */
export interface InconsistentNamingWarning {
  key1: string;
  key2: string;
  suggestion: string;
}
