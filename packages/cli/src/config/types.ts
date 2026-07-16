import { ALLOWED_CATEGORIES, GITIGNORE_ISSUES } from './constants.js';
import { type SecretFinding } from '../core/security/secretDetectors.js';

/**
 * Supported frameworks
 */
export type SupportedFramework = 'sveltekit' | 'nextjs' | 'nuxt';

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
export interface Duplicate {
  /** The environment variable key that is duplicated */
  key: string;
  /** The number of times this key is duplicated */
  count: number;
}

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
  baseline?: boolean;
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
  listAll?: boolean;
  explain?: string;
  matrix?: boolean | string[];
  suggest?: boolean;
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
  baseline: boolean;
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
  listAll: boolean;
  explain: string | undefined;
  matrix: boolean;
  matrixFiles: string[];
  suggest: boolean;
}

export type EnvPatternName =
  'process.env' | 'import.meta.env' | 'sveltekit' | 'vite';

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
  pattern: EnvPatternName;
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
  listAll?: boolean;
  baseline?: boolean;
  suggest?: boolean;
}

/**
 * A directory-scoped set of documented env keys, sourced from an `.env.example`
 * (or `.env-example`/`.env.sample`/`.env.template`) file in a subdirectory.
 *
 * Used for monorepo "nearest example wins" matching: a variable used in a file is
 * considered defined when it appears in the env keys of any ancestor scope (or the
 * primary comparison file), not only the root file.
 */
export interface EnvScope {
  /** Directory of the example file, relative to cwd, forward-slashed (e.g. "packages/api"). */
  dir: string;
  /** Keys documented in that example file (already ignore-filtered). */
  keys: Set<string>;
}

/**
 * Result of scanning the codebase for environment variable usages.
 */
export interface ScanResult {
  used: EnvUsage[];
  missing: string[];
  unused: string[];
  /**
   * Keys declared by a central config loader (e.g. a Zod/envalid schema over the
   * whole `process.env`). Used only to suppress false "unused" findings — they do
   * not count as usages for missing detection, stats, or the health score.
   */
  declaredKeys?: string[];
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
  /** Typo suggestions for variables used in code but not defined in the env file */
  suggestions?: TypoSuggestion[];
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
  suggestions?: TypoSuggestion[];
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
  suggest?: boolean;
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
  suggestions?: TypoSuggestion[];
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
 * A "did you mean" suggestion produced when a reported key looks like a typo
 * of an existing key.
 * fx: DATABASE_URL is missing while DATABAS_URL exists → suggest DATABASE_URL.
 */
export interface TypoSuggestion {
  /** The key reported as missing (compare) or used-but-undefined (scan) */
  key: string;
  /** The closest existing key that was likely intended */
  didYouMean: string;
  /** The Levenshtein distance between the two keys */
  distance: number;
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

/**
 * All warning categories that can be suppressed in a baseline file.
 */
export type BaselineRule =
  | 'missing'
  | 'unused'
  | 'logged'
  | 'secret'
  | 'example-secret'
  | 'duplicate-env'
  | 'duplicate-example'
  | 'framework'
  | 'uppercase'
  | 'expire'
  | 'inconsistent-naming';

/**
 * A single suppressed warning in the baseline file.
 * `key` is a stable identifier (variable name, fingerprint, or sorted pair).
 * `file` is only set for warnings that are tied to a specific source file.
 */
export interface BaselineEntry {
  /** The category of the warning being suppressed (e.g. 'missing', 'secret', etc.) */
  rule: BaselineRule;
  /** A stable identifier for the warning (e.g. variable name, fingerprint, or sorted pair) */
  key: string;
  /** The file associated with the warning, if applicable */
  file?: string;
}

/**
 * Shape of `dotenv-diff.baseline.json` as written to disk.
 */
export interface BaselineFile {
  /** The version of the baseline file format */
  version: number;
  /** The timestamp when the baseline file was created */
  createdAt: string;
  /** The list of baseline entries */
  entries: BaselineEntry[];
}

/**
 * A single file column being compared in matrix mode (--matrix).
 */
export interface MatrixFileInput {
  /** Display name of the file (e.g. ".env.production") */
  name: string;
  /** Parsed and ignore-filtered key-value pairs for this file */
  values: Record<string, string>;
}

/**
 * A single key's presence/value status across all files compared in matrix mode.
 */
export interface MatrixRow {
  /** The environment variable key */
  key: string;
  /** Whether each file (aligned with MatrixResult.files) defines this key */
  presence: boolean[];
  /** The value of this key in each file (aligned with MatrixResult.files), undefined when absent */
  values: (string | undefined)[];
  /** True when the key is present in 2+ files with differing values (only computed when checkValues is enabled) */
  hasMismatch: boolean;
}

/**
 * Result of comparing 2+ env files as a key-presence matrix (--matrix).
 */
export interface MatrixResult {
  /** Display names of the compared files, in column order */
  files: string[];
  /** One row per unique key found across all files, sorted alphabetically */
  rows: MatrixRow[];
  /** True when every file has every key, with matching values when checkValues is enabled */
  allMatch: boolean;
}

/**
 * Options for running matrix comparison (--matrix flag).
 */
export interface MatrixRunOptions {
  cwd: string;
  /** Explicit file names/paths to compare; empty means auto-discover all .env* files in cwd */
  files: string[];
  ignore: string[];
  ignoreRegex: RegExp[];
  checkValues: boolean;
  json: boolean;
  showStats: boolean;
}
