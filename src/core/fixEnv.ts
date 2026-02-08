import fs from 'fs';
import path from 'path';
import { isEnvIgnoredByGit, isGitRepo, findGitRoot } from '../services/git.js';
import { DEFAULT_GITIGNORE_ENV_PATTERNS } from '../config/constants.js';

/**
 * Options for applying fixes to environment files
 */
interface ApplyFixesOptions {
  /** Path to the .env file to fix */
  envPath: string;
  /** List of missing keys to add to the .env file */
  missingKeys: string[];
  /** List of duplicate keys to remove from the .env file (keep last occurrence) */
  duplicateKeys: string[];
  /** Whether to ensure .env is ignored in .gitignore (if in a git repo) */
  ensureGitignore?: boolean;
}

/**
 * Result of applying fixes to environment files
 */
interface FixResult {
  /** List of removed duplicate keys */
  removedDuplicates: string[];
  /** List of added environment variables */
  addedEnv: string[];
  /** Whether the .gitignore file was updated */
  gitignoreUpdated: boolean;
}

/**
 * Applies fixes to the .env file based on the detected issues.
 *
 * This function will:
 * - Remove duplicate keys from .env (keeping the last occurrence)
 * - Add missing keys to .env file (with empty values)
 * - Ensure .env is ignored in .gitignore (if in a git repo and ensureGitignore is true)
 *
 * @param options - Fix options including file paths and keys to fix
 * @returns An object indicating whether changes were made and details of the changes
 */
export function applyFixes(options: ApplyFixesOptions): {
  changed: boolean;
  result: FixResult;
} {
  const {
    envPath,
    missingKeys = [],
    duplicateKeys = [],
    ensureGitignore = false,
  } = options;

  const result: FixResult = {
    removedDuplicates: [],
    addedEnv: [],
    gitignoreUpdated: false,
  };

  // --- Remove duplicates ---
  if (duplicateKeys.length) {
    const duplicateSet = new Set(duplicateKeys);

    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    const seen = new Set<string>();
    const newLines: string[] = [];

    // Process from bottom to top, keeping last occurrence
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line === undefined) continue;

      const match = line.match(/^\s*([\w.-]+)\s*=/);
      if (match) {
        const key = match[1] || '';
        if (duplicateSet.has(key)) {
          if (seen.has(key)) continue; // Skip duplicate
          seen.add(key);
        }
      }
      newLines.unshift(line);
    }

    fs.writeFileSync(envPath, newLines.join('\n'));
    result.removedDuplicates = duplicateKeys;
  }

  // --- Add missing keys to .env ---
  if (missingKeys.length) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const newContent =
      content +
      (content.endsWith('\n') ? '' : '\n') +
      missingKeys.map((k) => `${k}=`).join('\n') +
      '\n';
    fs.writeFileSync(envPath, newContent);
    result.addedEnv = missingKeys;
  }
  // --- Ensure .env is ignored in .gitignore ---
  if (ensureGitignore) {
    result.gitignoreUpdated = updateGitignoreForEnv(envPath);
  }

  const changed =
    result.removedDuplicates.length > 0 ||
    result.addedEnv.length > 0 ||
    result.gitignoreUpdated;

  return { changed, result };
}

/**
 * Ensures .env patterns are present in .gitignore at the git repository root.
 * This is a best-effort operation and will not throw errors.
 *
 * @param envPath - Path to the .env file to check gitignore for
 * @returns true if .gitignore was updated, false otherwise
 */
function updateGitignoreForEnv(envPath: string): boolean {
  try {
    const startDir = path.dirname(envPath);
    const gitRoot = findGitRoot(startDir);

    if (!gitRoot || !isGitRepo(gitRoot)) {
      return false;
    }

    const gitignorePath = path.join(gitRoot, '.gitignore');
    const envFileName = path.basename(envPath);
    const ignored = isEnvIgnoredByGit({ cwd: gitRoot, envFile: envFileName });

    // Already properly ignored
    if (ignored === true) {
      return false;
    }

    // Need to add patterns
    const patterns = DEFAULT_GITIGNORE_ENV_PATTERNS;

    if (fs.existsSync(gitignorePath)) {
      const current = fs.readFileSync(gitignorePath, 'utf8');
      const existingLines = current.split(/\r?\n/).map((l) => l.trim());

      const missingPatterns = patterns.filter(
        (pattern) => !existingLines.includes(pattern),
      );

      if (missingPatterns.length) {
        const toAppend = `${current.endsWith('\n') ? '' : '\n'}${missingPatterns.join('\n')}\n`;
        fs.appendFileSync(gitignorePath, toAppend);
        return true;
      }
    } else {
      // Create new .gitignore
      fs.writeFileSync(gitignorePath, patterns.join('\n') + '\n');
      return true;
    }

    return false;
  } catch {
    // Non-blocking: ignore errors
    return false;
  }
}
