import fs from 'fs';
import path from 'path';
import { isEnvIgnoredByGit, isGitRepo, findGitRoot } from '../services/git.js';

/**
 * Applies fixes to the .env and .env.example files based on the detected issues.
 * @param envPath - The path to the .env file.
 * @param examplePath - The path to the .env.example file.
 * @param missingKeys - The list of missing keys to add.
 * @param duplicateKeys - The list of duplicate keys to remove.
 * @returns An object indicating whether changes were made and details of the changes.
 */
export function applyFixes({
  envPath,
  examplePath,
  missingKeys,
  duplicateKeys,
}: {
  envPath: string;
  examplePath: string;
  missingKeys: string[];
  duplicateKeys: string[];
}) {
  const result = {
    removedDuplicates: [] as string[],
    addedEnv: [] as string[],
    addedExample: [] as string[],
    gitignoreUpdated: false as boolean,
  };

  // --- Remove duplicates ---
  if (duplicateKeys.length) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    const seen = new Set<string>();
    const newLines: string[] = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line === undefined) continue;
      const match = line.match(/^\s*([\w.-]+)\s*=/);
      if (match) {
        const key = match[1] || '';
        if (duplicateKeys.includes(key)) {
          if (seen.has(key)) continue; // skip duplicate
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

  // --- Add missing keys to .env.example ---
  if (examplePath && missingKeys.length) {
    const exContent = fs.readFileSync(examplePath, 'utf-8');
    const existingExKeys = new Set(
      exContent
        .split('\n')
        .map((l) => l.trim().split('=')[0])
        .filter(Boolean),
    );
    const newExampleKeys = missingKeys.filter((k) => !existingExKeys.has(k));
    if (newExampleKeys.length) {
      const newExContent =
        exContent +
        (exContent.endsWith('\n') ? '' : '\n') +
        newExampleKeys.join('\n') +
        '\n';
      fs.writeFileSync(examplePath, newExContent);
      result.addedExample = newExampleKeys;
    }
  }

  // --- Ensure .env is ignored in gitignore (best-effort; write at git root) ---
  try {
    const startDir = path.dirname(envPath);
    const gitRoot = findGitRoot(startDir);
    if (gitRoot && isGitRepo(gitRoot)) {
      const gitignorePath = path.join(gitRoot, '.gitignore');
      // Check against the actual file name (".env" or custom)
      const envFileName = path.basename(envPath);
      const ignored = isEnvIgnoredByGit({ cwd: gitRoot, envFile: envFileName });

      if (ignored === false || ignored === null) {
        const entry = '.env\n.env.*\n';
        if (fs.existsSync(gitignorePath)) {
          const current = fs.readFileSync(gitignorePath, 'utf8');
          // Avoid duplicate entries
          const hasDotEnv = current.split(/\r?\n/).some((l) => l.trim() === '.env');
          const hasDotEnvStar = current.split(/\r?\n/).some((l) => l.trim() === '.env.*');
          const pieces: string[] = [];
          if (!hasDotEnv) pieces.push('.env');
          if (!hasDotEnvStar) pieces.push('.env.*');

          if (pieces.length) {
            const toAppend = `${current.endsWith('\n') ? '' : '\n'}${pieces.join('\n')}\n`;
            fs.appendFileSync(gitignorePath, toAppend);
            result.gitignoreUpdated = true;
          }
        } else {
          fs.writeFileSync(gitignorePath, entry);
          result.gitignoreUpdated = true;
        }
      }
    }
  } catch {
    // ignore errors - non-blocking DX
  }

  const changed =
    result.removedDuplicates.length > 0 ||
    result.addedEnv.length > 0 ||
    result.addedExample.length > 0 ||
    result.gitignoreUpdated;

  return { changed, result };
}
