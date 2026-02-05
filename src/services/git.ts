import fs from 'fs';
import path from 'path';
import { printGitignoreWarning } from '../ui/shared/printGitignore.js';
import {
  DEFAULT_ENV_FILE,
  DEFAULT_EXAMPLE_FILE,
  GITIGNORE_FILE,
  GIT_DIR,
  GITIGNORE_ISSUES,
} from '../config/constants.js';
import type { GitignoreIssue } from '../config/types.js';

/** 
 * Options for checking gitignore status
 */
interface GitignoreCheckOptions {
  /** Project root directory (default: process.cwd()) */
  cwd?: string;
  /** Name of the env file (default: ".env") */
  envFile?: string;
  /** Custom logger (default: console.log) */
  log?: (msg: string) => void;
}

/** Are we in a git repo? (checks for .git directory in cwd) */
export function isGitRepo(cwd = process.cwd()): boolean {
  return fs.existsSync(path.resolve(cwd, GIT_DIR));
}

/**
 * Returns:
 *  - true  → .env-matching patterns are found in .gitignore
 *  - false → .env-matching patterns are NOT found (or a negation exists)
 *  - null  → no .gitignore exists
 * @param options - Options for the gitignore check.
 * @returns True if the env file is ignored, false if not, or null if no .gitignore exists.
 */
export function isEnvIgnoredByGit(
  options: GitignoreCheckOptions = {},
): boolean | null {
  const { cwd = process.cwd(), envFile = DEFAULT_ENV_FILE } = options;
  const gitignorePath = path.resolve(cwd, GITIGNORE_FILE);
  if (!fs.existsSync(gitignorePath)) return null;

  const raw = fs.readFileSync(gitignorePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  // If there is a negation (!pattern) that matches our candidates, we consider it as "not ignored"
  if (
    lines.some(
      (l) => l.startsWith('!') && matchesCandidate(l.slice(1), envFile),
    )
  ) {
    return false;
  }

  const candidates = getCandidatePatterns(envFile);
  return lines.some((line) => candidates.has(line));
}

/** Our simple candidate patterns that typically cover env files in the root and subfolders
 * (e.g., ".env", ".env.local", "subdir/.env.test", etc.)
 * @param envFile - The env file name (default: ".env")
 * @returns A set of candidate patterns
 */
function getCandidatePatterns(envFile = DEFAULT_ENV_FILE): Set<string> {
  const base = envFile; // ".env"
  const star = `${base}*`; // ".env*"
  const dotStar = `${base}.*`; // ".env.*"

  return new Set([
    base,
    `/${base}`,
    `**/${base}`,
    star,
    `/${star}`,
    `**/${star}`,
    dotStar,
    `/${dotStar}`,
    `**/${dotStar}`,
  ]);
}

/**
 * Checks if a given pattern matches any of the candidate patterns for the env file.
 * @param pattern - The pattern to check
 * @param envFile - The env file name (default: ".env")
 * @returns True if the pattern matches a candidate, false otherwise
 */
function matchesCandidate(pattern: string, envFile: string): boolean {
  return getCandidatePatterns(envFile).has(pattern);
}

/** Warns the user if the .env file is not properly ignored by git
 * @param options - Options for the gitignore check.
 * @returns void
 */
export function warnIfEnvNotIgnored(options: GitignoreCheckOptions = {}): void {
  const {
    cwd = process.cwd(),
    envFile = DEFAULT_ENV_FILE,
    log = console.log,
  } = options;

  const envPath = path.resolve(cwd, envFile);
  if (!fs.existsSync(envPath)) return;
  if (!isGitRepo(cwd)) return;

  const ignored = isEnvIgnoredByGit({ cwd, envFile });

  if (ignored === null) {
    printGitignoreWarning({
      envFile,
      reason: GITIGNORE_ISSUES.NO_GITIGNORE,
      log,
    });
    return;
  }

  if (ignored === false) {
    printGitignoreWarning({
      envFile,
      reason: GITIGNORE_ISSUES.NOT_IGNORED,
      log,
    });
  }
}

/**
 * Checks if .env file has gitignore issues.
 * Returns null if no issue, otherwise returns the reason.
 * @param options - Options for the gitignore check.
 * @returns Null if no issue, otherwise the reason for the issue.
 */
export function checkGitignoreStatus(options: GitignoreCheckOptions = {}): {
  reason: GitignoreIssue;
} | null {
  const { cwd = process.cwd(), envFile = DEFAULT_ENV_FILE } = options;

  // .env.example is not expected to be gitignored
  if (envFile === DEFAULT_EXAMPLE_FILE) return null;

  const envPath = path.resolve(cwd, envFile);
  if (!fs.existsSync(envPath)) return null;
  if (!isGitRepo(cwd)) return null;

  const gitignorePath = path.resolve(cwd, GITIGNORE_FILE);

  if (!fs.existsSync(gitignorePath)) {
    return { reason: GITIGNORE_ISSUES.NO_GITIGNORE };
  }

  const ignored = isEnvIgnoredByGit({ cwd, envFile });
  if (ignored === false || ignored === null) {
    return { reason: GITIGNORE_ISSUES.NOT_IGNORED };
  }

  return null;
}

/** Find the git repository root starting from startDir (walk up until ".git").
 * @param startDir The directory to start searching from
 * @returns The git root directory path, or null if not found
 */
export function findGitRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const gitDir = path.join(dir, GIT_DIR);
    if (fs.existsSync(gitDir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}
