import fs from 'fs/promises';
import path from 'path';
import type { EnvUsage, ScanOptions, ScanResult } from '../config/types.js';
import {
  detectSecretsInSource,
  type SecretFinding,
} from '../core/security/secretDetectors.js';
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
    const content = await safeReadFile(filePath);
    if (!content) continue;

    // Scan the file for environment variable usages
    const fileUsages = scanFile(filePath, content, opts);
    allUsages.push(...fileUsages);

    // Store file content for later use (e.g., framework validation 'use client')
    const relativePath = path.relative(opts.cwd, filePath);
    fileContentMap.set(relativePath, content);

    // Detect secrets in the file content
    const secrets = safeDetectSecrets(relativePath, content, opts);
    if (secrets.length) allSecrets.push(...secrets);

    // Count successfully scanned files
    filesScanned++;

    if (shouldPrintProgress(filesScanned, files.length)) {
      printProgress({
        isJson: opts.json,
        current: filesScanned,
        total: files.length,
      });
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

/**
 * Detects secrets in the given file content if secret detection is enabled.
 * @param relativePath - The relative path of the file being scanned.
 * @param content - The content of the file.
 * @param opts - The scan options.
 * @returns An array of secret findings.
 */
function safeDetectSecrets(
  relativePath: string,
  content: string,
  opts: ScanOptions,
): SecretFinding[] {
  if (!opts.secrets) return [];

  try {
    return detectSecretsInSource(relativePath, content, opts).filter(
      (s) => s.severity !== 'low',
    );
  } catch {
    return [];
  }
}

/**
 * Safely reads a file and returns its content or null if reading fails.
 * @param filePath - The path to the file to read.
 * @returns The file content as a string, or null if an error occurs.
 */
async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** * Determines whether to print progress based on the number of files scanned.
 * @param scanned - The number of files scanned so far.
 * @param total - The total number of files to scan.
 * @returns True if progress should be printed, false otherwise.
 */
function shouldPrintProgress(scanned: number, total: number): boolean {
  return scanned === 1 || scanned % 10 === 0 || scanned === total;
}
