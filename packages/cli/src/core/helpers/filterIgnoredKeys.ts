/** OS / shell environment variables. */
const OS_KEYS = [
  'PWD',
  'INIT_CWD',
  'TZ',
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'LANG',
  'TMP',
  'TEMP',
  'TMPDIR',
];

/** Node.js / npm and server runtime variables. */
const NODE_KEYS = ['NODE_ENV', 'NODE_PATH', 'PORT'];

/** Framework build/runtime variables (Vite, etc.). */
const FRAMEWORK_KEYS = [
  'VITE_MODE',
  'MODE',
  'BASE_URL',
  'PROD',
  'DEV',
  'SSR',
  'SLOW_MO',
];

/**
 * Generic CI flags set by many CI providers. Provider-specific variables
 * that come in large, predictable families are matched via
 * {@link DEFAULT_EXCLUDE_REGEX} instead.
 */
const CI_KEYS = [
  'CI',
  'CONTINUOUS_INTEGRATION',
  'BUILD_NUMBER',
  'BUILD_ID',
  'VERCEL',
  'NETLIFY',
  'GITLAB_CI',
  'CIRCLECI',
  'BUILDKITE',
  'DRONE',
  'TRAVIS',
  'APPVEYOR',
  'TEAMCITY_VERSION',
  'JENKINS_URL',
];

/**
 * Default exclude environment variable keys (not expected in .env files)
 * but may be used in code.
 */
export const DEFAULT_EXCLUDE_KEYS = [
  ...OS_KEYS,
  ...NODE_KEYS,
  ...FRAMEWORK_KEYS,
  ...CI_KEYS,
];

/**
 * Default exclude regex patterns for CI-injected variables that arrive in
 * large, predictable provider-specific families. These are never set by a
 * user in a .env file, so they should not be reported as missing.
 */
export const DEFAULT_EXCLUDE_REGEX = [
  /^GITHUB_/, // GitHub Actions (GITHUB_SHA, GITHUB_REF_NAME, GITHUB_RUN_ID, ...)
  /^RUNNER_/, // GitHub Actions runner (RUNNER_OS, RUNNER_TEMP, ...)
  /^VERCEL_/, // Vercel (VERCEL_ENV, VERCEL_URL, VERCEL_GIT_*, ...)
  /^CI_/, // GitLab CI (CI_COMMIT_SHA, CI_PIPELINE_ID, ...)
  /^CIRCLE_/, // CircleCI (CIRCLE_SHA1, CIRCLE_BRANCH, ...)
];

/**
 * Filters out keys that are in the ignore list, match any of the ignore regex
 * patterns, or match the built-in default excludes (exact keys or regex).
 * @param keys - The list of keys to filter.
 * @param ignore - The list of keys to ignore.
 * @param ignoreRegex - The list of regex patterns to ignore.
 * @returns The filtered list of keys.
 */
export function filterIgnoredKeys(
  keys: string[],
  ignore: string[],
  ignoreRegex: RegExp[],
): string[] {
  return keys.filter(
    (k) =>
      !ignore.includes(k) &&
      !DEFAULT_EXCLUDE_KEYS.includes(k) &&
      !DEFAULT_EXCLUDE_REGEX.some((rx) => rx.test(k)) &&
      !ignoreRegex.some((rx) => rx.test(k)),
  );
}
