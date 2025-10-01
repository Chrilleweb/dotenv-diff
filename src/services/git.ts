import fs from 'fs';
import path from 'path';
import { printGitignoreWarning } from '../ui/shared/printGitignore.js';

export type GitignoreCheckOptions = {
  /** Project root directory (default: process.cwd()) */
  cwd?: string;
  /** Name of the env file (default: ".env") */
  envFile?: string;
  /** Custom logger (default: console.log) */
  log?: (msg: string) => void;
};

/** Are we in a git repo? (checks for .git directory in cwd) */
export function isGitRepo(cwd = process.cwd()): boolean {
  return fs.existsSync(path.resolve(cwd, '.git'));
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
  const { cwd = process.cwd(), envFile = '.env' } = options;
  const gitignorePath = path.resolve(cwd, '.gitignore');
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

/** Our simple candidate patterns that typically cover env files in the root and subfolders */
function getCandidatePatterns(envFile = '.env'): Set<string> {
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

// Matches only against our own candidate patterns (intentionally simple)
function matchesCandidate(pattern: string, envFile: string): boolean {
  return getCandidatePatterns(envFile).has(pattern);
}

/**
 * Logs a friendly warning if .env is not ignored by Git.
 * - Does not hard fail: non-blocking DX.
 * - Skips if not in a git repo or if .env does not exist.
 * @param options - Options for the warning behavior.
 * @returns console.log messages or void
 */
export function warnIfEnvNotIgnored(options: GitignoreCheckOptions = {}): void {
  const { cwd = process.cwd(), envFile = '.env', log = console.log } = options;

  const envPath = path.resolve(cwd, envFile);
  if (!fs.existsSync(envPath)) return; // No .env file → nothing to warn about
  if (!isGitRepo(cwd)) return; // Not a git repo → skip

  const gitignorePath = path.resolve(cwd, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    printGitignoreWarning({
      envFile,
      reason: 'no-gitignore',
      log,
    });
    return;
  }

  const ignored = isEnvIgnoredByGit({ cwd, envFile });
  if (ignored === false || ignored === null) {
    printGitignoreWarning({
      envFile,
      reason: 'not-ignored',
      log,
    });
  }
}


/**
 * Checks if .env file has gitignore issues.
 * Returns null if no issue, otherwise returns the reason.
 */
export function checkGitignoreStatus(options: GitignoreCheckOptions = {}): {
  reason: 'no-gitignore' | 'not-ignored';
} | null {
  const { cwd = process.cwd(), envFile = '.env' } = options;

  const envPath = path.resolve(cwd, envFile);
  if (!fs.existsSync(envPath)) return null;
  if (!isGitRepo(cwd)) return null;

  const gitignorePath = path.resolve(cwd, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return { reason: 'no-gitignore' };
  }

  const ignored = isEnvIgnoredByGit({ cwd, envFile });
  if (ignored === false || ignored === null) {
    return { reason: 'not-ignored' };
  }

  return null;
}

/** Find the git repository root starting from startDir (walk up until ".git"). */
export function findGitRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const gitDir = path.join(dir, '.git');
    if (fs.existsSync(gitDir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}
