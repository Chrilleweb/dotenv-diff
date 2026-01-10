import fs from 'fs/promises';
import path from 'path';
import type { EnvUsage, ScanOptions, ScanResult } from '../config/types.js';
import {
  detectSecretsInSource,
  type SecretFinding,
} from '../core/secretDetectors.js';
import { DEFAULT_EXCLUDE_PATTERNS } from '../core/patterns.js';
import { scanFile } from '../core/scanFile.js';
import { findFiles } from './fileWalker.js';
import { printProgress } from '../ui/scan/printProgress.js';

/**
 * Scans the codebase for environment variable usage based on the provided options.
 * @param opts - Options for scanning the codebase.
 * @returns A promise that resolves to the scan result containing used, missing, and unused variables.
 */
export async function scanCodebase(opts: ScanOptions): Promise<ScanResult> {
  const files = await findFiles(opts.cwd, {
    include: opts.include,
    exclude: [...DEFAULT_EXCLUDE_PATTERNS, ...opts.exclude],
    ...(opts.files ? { files: opts.files } : {}), // Pass files option
  });

  const allUsages: EnvUsage[] = [];
  let filesScanned = 0;
  const allSecrets: SecretFinding[] = [];
  const fileContentMap = new Map<string, string>();

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      const fileUsages = scanFile(filePath, content, opts);
      allUsages.push(...fileUsages);

      // Store file content for framework validation
      const relativePath = path.relative(opts.cwd, filePath);
      fileContentMap.set(relativePath, content);
      if (opts.secrets) {
        try {
          const sec = detectSecretsInSource(relativePath, content, opts).filter(
            (s) => s.severity !== 'low',
          );

          if (sec.length) allSecrets.push(...sec);
        } catch {
          // Ignore secret detection errors
        }
      }
      // Count successfully scanned files
      filesScanned++;

      // Update every 10 files, or always on first and last
      if (filesScanned === 1 || filesScanned % 10 === 0 || filesScanned === files.length) {
        printProgress({
          isJson: opts.json,
          current: filesScanned,
          total: files.length,
        });
      }
    } catch {
      // Skip files we can't read (binary, permissions, etc.)
      continue;
    }
  }

  // Filter out ignored variables
  const filteredUsages = allUsages.filter(
    (usage) =>
      !opts.ignore.includes(usage.variable) &&
      !opts.ignoreRegex.some((regex) => regex.test(usage.variable)),
  );

  const uniqueVariables = [...new Set(filteredUsages.map((u) => u.variable))];

  const loggedVariables = filteredUsages.filter((u) => u.isLogged);

  return {
    used: filteredUsages,
    missing: [],
    unused: [],
    secrets: allSecrets,
    stats: {
      filesScanned,
      totalUsages: filteredUsages.length,
      uniqueVariables: uniqueVariables.length,
      warningsCount: 0,
      duration: 0,
    },
    duplicates: {
      env: [],
      example: [],
    },
    logged: loggedVariables,
    fileContentMap,
  };
}
