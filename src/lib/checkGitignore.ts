import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

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
 */
export function warnIfEnvNotIgnored(options: GitignoreCheckOptions = {}): void {
  const { cwd = process.cwd(), envFile = '.env', log = console.log } = options;

  const envPath = path.resolve(cwd, envFile);
  if (!fs.existsSync(envPath)) return; // No .env file → nothing to warn about

  if (!isGitRepo(cwd)) return; // Not a git repo → skip

  const gitignorePath = path.resolve(cwd, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    log(
      chalk.yellow(
        `⚠️  No .gitignore found – your ${envFile} may be committed.\n   Add:\n   ${envFile}\n   ${envFile}.*\n`,
      ),
    );
    return;
  }

  const ignored = isEnvIgnoredByGit({ cwd, envFile });
  if (ignored === false || ignored === null) {
    log(
      chalk.yellow(
        `⚠️  ${envFile} is not ignored by Git (.gitignore).\n   Consider adding:\n   ${envFile}\n   ${envFile}.*\n`,
      ),
    );
  }
}
