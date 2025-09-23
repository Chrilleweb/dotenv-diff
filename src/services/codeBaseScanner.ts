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

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileUsages = await scanFile(filePath, content, opts);
      allUsages.push(...fileUsages);
      if (opts.secrets) {
        try {
          // Brug relativ path i findings, så output matcher dine øvrige prints
          const relativePath = path.relative(opts.cwd, filePath);
          const sec = detectSecretsInSource(relativePath, content);
          if (sec.length) allSecrets.push(...sec);
        } catch {
          // aldrig fail scannet pga. detector; bare fortsæt
        }
      }
      filesScanned++;
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

  return {
    used: filteredUsages,
    missing: [],
    unused: [],
    secrets: allSecrets,
    stats: {
      filesScanned,
      totalUsages: filteredUsages.length,
      uniqueVariables: uniqueVariables.length,
    },
    duplicates: {
      env: [],
      example: [],
    },
  };
}
