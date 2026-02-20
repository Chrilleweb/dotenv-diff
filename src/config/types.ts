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
  /** The environment variable causing the warning */
  variable: string;
  /** The reason for the warning */
  reason: string;
  /** The file where the warning was detected */
  file: string;
  /** The line number where the warning was detected */
  line: number;
  /** The framework in which the warning was detected */
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
  /** Number of duplicate keys in the .env file */
  dupsEnv: Duplicate[];
  /** Number of duplicate keys in the .env.example file */
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
  /** The environment variable being used */
  variable: string;
  /** The file where the usage was detected */
  file: string;
  /** The line number where the usage was detected */
  line: number;
  /** The column number where the usage was detected */
  column: number;
  /** The pattern used to access the environment variable */
  pattern: 'process.env' | 'import.meta.env' | 'sveltekit';
  /** List of imported env modules (for sveltekit) */
  imports?: string[];
  /** The actual line content where the usage was detected */
  context: string;
  /** Whether this usage is logged to console */
  isLogged?: boolean;
}

/**
 * Type for grouped usages by variable
 */
export type VariableUsages = Record<string, EnvUsage[]>;

/**
 * Warning about secrets found in example files
 */
export interface ExampleSecretWarning {
  /** The environment variable key */
  key: string;
  /** The environment variable value */
  value: string;
  /** The reason for the warning */
  reason: string;
  /** The severity of the warning */
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
  /** Absolute path to the comparison file */
  path: string;
  /** Display name of the comparison file */
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
  /** Whether the process should exit with an error */
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
  /** The environment variable key */
  key: string;
  /** Suggested uppercase version of the key */
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
  /** The environment variable key */
  key: string;
  /** The expiration date of the environment variable */
  date: string;
  /** The number of days left until the environment variable expires */
  daysLeft: number;
}

/**
 * Warning about inconsistent naming of environment variable keys.
 * fx: If you have both SECRET_KEY and SECRETKEY (inconsistent naming)
 */
export interface InconsistentNamingWarning {
  /** The first environment variable key */
  key1: string;
  /** The second environment variable key */
  key2: string;
  /** Suggested consistent naming for the keys */
  suggestion: string;
}
